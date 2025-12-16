import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiUrl, apiRequest } from "@/lib/query-client";

const AUTH_TOKEN_KEY = "@bakuscan/auth_token";
const AUTH_USER_KEY = "@bakuscan/auth_user";
const GUEST_MODE_KEY = "@bakuscan/guest_mode";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  provider: string;
  createdAt: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  login: (provider: "google" | "apple", credentials: GoogleCredentials | AppleCredentials) => Promise<{ isNewUser: boolean }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  continueAsGuest: () => Promise<void>;
}

interface GoogleCredentials {
  accessToken: string;
}

interface AppleCredentials {
  identityToken: string;
  fullName?: {
    givenName?: string | null;
    familyName?: string | null;
  } | null;
  email?: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  async function loadStoredAuth() {
    try {
      const [storedToken, storedUser, storedGuestMode] = await Promise.all([
        AsyncStorage.getItem(AUTH_TOKEN_KEY),
        AsyncStorage.getItem(AUTH_USER_KEY),
        AsyncStorage.getItem(GUEST_MODE_KEY),
      ]);

      if (storedGuestMode === "true") {
        setIsGuest(true);
      } else if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        
        verifyToken(storedToken);
      }
    } catch (error) {
      console.error("Failed to load stored auth:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function verifyToken(authToken: string) {
    try {
      const response = await fetch(new URL("/api/auth/me", getApiUrl()).toString(), {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        await clearAuth();
        return;
      }

      const data = await response.json();
      setUser(data.user);
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
    } catch (error) {
      console.error("Token verification failed:", error);
    }
  }

  async function clearAuth() {
    setUser(null);
    setToken(null);
    setIsGuest(false);
    await Promise.all([
      AsyncStorage.removeItem(AUTH_TOKEN_KEY),
      AsyncStorage.removeItem(AUTH_USER_KEY),
      AsyncStorage.removeItem(GUEST_MODE_KEY),
    ]);
  }

  const login = useCallback(async (
    provider: "google" | "apple",
    credentials: GoogleCredentials | AppleCredentials
  ): Promise<{ isNewUser: boolean }> => {
    const endpoint = provider === "google" ? "/api/auth/google" : "/api/auth/apple";
    
    const response = await apiRequest("POST", endpoint, credentials);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Login failed");
    }

    setUser(data.user);
    setToken(data.token);

    setIsGuest(false);
    await Promise.all([
      AsyncStorage.setItem(AUTH_TOKEN_KEY, data.token),
      AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user)),
      AsyncStorage.removeItem(GUEST_MODE_KEY),
    ]);

    return { isNewUser: data.isNewUser };
  }, []);

  const logout = useCallback(async () => {
    await clearAuth();
  }, []);

  const continueAsGuest = useCallback(async () => {
    setIsGuest(true);
    await AsyncStorage.setItem(GUEST_MODE_KEY, "true");
  }, []);

  const refreshUser = useCallback(async () => {
    if (token) {
      await verifyToken(token);
    }
  }, [token]);

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user && !!token,
    isGuest,
    login,
    logout,
    refreshUser,
    continueAsGuest,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function getStoredToken(): Promise<string | null> {
  return AsyncStorage.getItem(AUTH_TOKEN_KEY);
}
