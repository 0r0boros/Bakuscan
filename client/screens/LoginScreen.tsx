import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import * as AppleAuthentication from "expo-apple-authentication";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";

WebBrowser.maybeCompleteAuthSession();

const showAlert = (title: string, message: string) => {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

const discovery = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  revocationEndpoint: "https://oauth2.googleapis.com/revoke",
};

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { login, continueAsGuest } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<"google" | "apple" | null>(null);

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_CLIENT_ID || "",
      scopes: ["openid", "profile", "email"],
      redirectUri: AuthSession.makeRedirectUri({
        scheme: "bakuscan",
      }),
    },
    discovery
  );

  React.useEffect(() => {
    if (response?.type === "success" && response.authentication?.accessToken) {
      handleGoogleLogin(response.authentication.accessToken);
    }
  }, [response]);

  const handleGoogleLogin = useCallback(async (accessToken: string) => {
    try {
      setIsLoading(true);
      setLoadingProvider("google");
      await login("google", { accessToken });
    } catch (error) {
      console.error("Google login error:", error);
      showAlert("Login Failed", "Could not sign in with Google. Please try again.");
    } finally {
      setIsLoading(false);
      setLoadingProvider(null);
    }
  }, [login]);

  const handleAppleLogin = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadingProvider("apple");
      
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error("No identity token received");
      }

      await login("apple", {
        identityToken: credential.identityToken,
        fullName: credential.fullName,
        email: credential.email,
      });
    } catch (error: unknown) {
      if ((error as { code?: string }).code === "ERR_REQUEST_CANCELED") {
        return;
      }
      console.error("Apple login error:", error);
      showAlert("Login Failed", "Could not sign in with Apple. Please try again.");
    } finally {
      setIsLoading(false);
      setLoadingProvider(null);
    }
  }, [login]);

  const handleGooglePress = useCallback(() => {
    if (!GOOGLE_CLIENT_ID) {
      showAlert(
        "Setup Required",
        "Google Sign-In is not configured yet. Please sign in with Apple or continue as guest."
      );
      return;
    }
    promptAsync();
  }, [promptAsync]);

  const isAppleAvailable = Platform.OS === "ios";

  const handleGuestPress = useCallback(async () => {
    await continueAsGuest();
  }, [continueAsGuest]);

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + Spacing.xl }]}>
      <View style={styles.header}>
        <Image
          source={require("../../assets/images/icon.png")}
          style={styles.logo}
          contentFit="contain"
        />
        <ThemedText type="h1" style={styles.title}>
          BakuScan
        </ThemedText>
        <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
          Identify and collect your Bakugan toys
        </ThemedText>
      </View>

      <View style={styles.content}>
        <ThemedText type="h3" style={styles.signInTitle}>
          Sign in to sync your collection
        </ThemedText>
        <ThemedText type="small" style={[styles.signInDescription, { color: theme.textSecondary }]}>
          Access your scans from any device
        </ThemedText>

        <View style={styles.buttonsContainer}>
          {isAppleAvailable ? (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={
                isDark
                  ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                  : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
              }
              cornerRadius={BorderRadius.lg}
              style={styles.appleButton}
              onPress={handleAppleLogin}
            />
          ) : null}

          <Pressable
            style={[
              styles.googleButton,
              { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
            ]}
            onPress={handleGooglePress}
            disabled={isLoading}
          >
            {loadingProvider === "google" ? (
              <ActivityIndicator color={theme.text} />
            ) : (
              <>
                <View style={styles.googleIconContainer}>
                  <ThemedText style={styles.googleIcon}>G</ThemedText>
                </View>
                <ThemedText type="body" style={styles.googleButtonText}>
                  Sign in with Google
                </ThemedText>
              </>
            )}
          </Pressable>
        </View>

        <Pressable
          style={styles.guestButton}
          onPress={handleGuestPress}
          disabled={isLoading}
        >
          <ThemedText type="body" style={[styles.guestButtonText, { color: theme.textSecondary }]}>
            Continue as Guest
          </ThemedText>
        </Pressable>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <ThemedText type="small" style={[styles.footerText, { color: theme.textSecondary }]}>
          Your data stays private and secure
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    alignItems: "center",
    marginTop: Spacing["2xl"],
    marginBottom: Spacing.xl,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: Spacing.lg,
  },
  title: {
    marginBottom: Spacing.xs,
  },
  subtitle: {
    textAlign: "center",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  signInTitle: {
    marginBottom: Spacing.xs,
    textAlign: "center",
  },
  signInDescription: {
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  buttonsContainer: {
    width: "100%",
    gap: Spacing.md,
  },
  appleButton: {
    width: "100%",
    height: 50,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 50,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  googleIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.light.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  googleIcon: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  googleButtonText: {
    fontWeight: "600",
  },
  guestButton: {
    paddingVertical: Spacing.lg,
    alignItems: "center",
  },
  guestButtonText: {
    textDecorationLine: "underline",
  },
  footer: {
    alignItems: "center",
  },
  footerText: {
    textAlign: "center",
  },
});
