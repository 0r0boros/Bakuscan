import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import * as crypto from "crypto";
import { storage } from "./storage";
import type { User } from "@shared/schema";

const JWT_SECRET = process.env.SESSION_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("SESSION_SECRET environment variable is required in production");
}
const EFFECTIVE_JWT_SECRET = JWT_SECRET || "bakuscan-dev-secret-key";
const JWT_EXPIRY = "30d";

export interface AuthRequest extends Request {
  user?: User;
  userId?: string;
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, EFFECTIVE_JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, EFFECTIVE_JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "No token provided" });
    return;
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);

  if (!decoded) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  const user = await storage.getUser(decoded.userId);
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  req.user = user;
  req.userId = user.id;
  next();
}

export async function optionalAuthMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (decoded) {
      const user = await storage.getUser(decoded.userId);
      if (user) {
        req.user = user;
        req.userId = user.id;
      }
    }
  }

  next();
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}

interface AppleIdTokenPayload {
  sub: string;
  email?: string;
  iss?: string;
  aud?: string;
  exp?: number;
}

interface AppleJWK {
  kty: string;
  kid: string;
  use: string;
  alg: string;
  n: string;
  e: string;
}

interface AppleJWKSResponse {
  keys: AppleJWK[];
}

let cachedAppleKeys: AppleJWK[] | null = null;
let appleKeysLastFetched = 0;
const APPLE_KEYS_CACHE_TTL = 86400000;

async function getApplePublicKeys(): Promise<AppleJWK[]> {
  const now = Date.now();
  if (cachedAppleKeys && (now - appleKeysLastFetched) < APPLE_KEYS_CACHE_TTL) {
    return cachedAppleKeys;
  }
  
  try {
    const response = await fetch("https://appleid.apple.com/auth/keys");
    if (!response.ok) {
      throw new Error(`Failed to fetch Apple JWKS: ${response.status}`);
    }
    const data = await response.json() as AppleJWKSResponse;
    cachedAppleKeys = data.keys;
    appleKeysLastFetched = now;
    return cachedAppleKeys;
  } catch (error) {
    console.error("Failed to fetch Apple public keys:", error);
    if (cachedAppleKeys) return cachedAppleKeys;
    throw error;
  }
}

function jwkToPem(jwk: AppleJWK): string {
  const n = Buffer.from(jwk.n, "base64url");
  const e = Buffer.from(jwk.e, "base64url");
  
  function encodeLength(len: number): Buffer {
    if (len < 0x80) return Buffer.from([len]);
    if (len < 0x100) return Buffer.from([0x81, len]);
    return Buffer.from([0x82, (len >> 8) & 0xff, len & 0xff]);
  }
  
  function encodeDerSequence(contents: Buffer[]): Buffer {
    const inner = Buffer.concat(contents);
    return Buffer.concat([Buffer.from([0x30]), encodeLength(inner.length), inner]);
  }
  
  function encodeDerInteger(data: Buffer): Buffer {
    let buf = data;
    if (buf[0] & 0x80) {
      buf = Buffer.concat([Buffer.from([0]), buf]);
    }
    return Buffer.concat([Buffer.from([0x02]), encodeLength(buf.length), buf]);
  }
  
  const rsaOid = Buffer.from([0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00]);
  const keySeq = encodeDerSequence([encodeDerInteger(n), encodeDerInteger(e)]);
  const bitString = Buffer.concat([Buffer.from([0x03]), encodeLength(keySeq.length + 1), Buffer.from([0x00]), keySeq]);
  const fullSeq = encodeDerSequence([encodeDerSequence([rsaOid]), bitString]);
  
  const base64 = fullSeq.toString("base64");
  const lines = base64.match(/.{1,64}/g) || [];
  return `-----BEGIN PUBLIC KEY-----\n${lines.join("\n")}\n-----END PUBLIC KEY-----`;
}

export async function verifyGoogleToken(accessToken: string): Promise<GoogleUserInfo | null> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/oauth2/v3/userinfo`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error("Google token verification failed:", await response.text());
      return null;
    }

    return await response.json() as GoogleUserInfo;
  } catch (error) {
    console.error("Failed to verify Google token:", error);
    return null;
  }
}

export async function verifyAppleIdToken(idToken: string, bundleId?: string): Promise<AppleIdTokenPayload | null> {
  try {
    const parts = idToken.split(".");
    if (parts.length !== 3) {
      console.error("Apple ID token: Invalid JWT format");
      return null;
    }
    
    const headerJson = Buffer.from(parts[0], "base64url").toString("utf-8");
    const header = JSON.parse(headerJson) as { kid?: string; alg?: string };
    
    if (!header.kid) {
      console.error("Apple ID token: Missing kid in header");
      return null;
    }
    
    const keys = await getApplePublicKeys();
    const matchingKey = keys.find(k => k.kid === header.kid);
    
    if (!matchingKey) {
      console.error("Apple ID token: No matching key found for kid:", header.kid);
      return null;
    }
    
    const publicKeyPem = jwkToPem(matchingKey);
    
    const payload = jwt.verify(idToken, publicKeyPem, {
      algorithms: ["RS256"],
      issuer: "https://appleid.apple.com",
    }) as AppleIdTokenPayload;
    
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      console.error("Apple ID token: Token has expired");
      return null;
    }
    
    return {
      sub: payload.sub,
      email: payload.email,
    };
  } catch (error) {
    console.error("Failed to verify Apple ID token:", error);
    return null;
  }
}

export async function loginOrRegister(
  provider: "google" | "apple",
  providerId: string,
  email: string,
  displayName?: string,
  avatarUrl?: string
): Promise<{ user: User; token: string; isNewUser: boolean }> {
  let user = await storage.getUserByProviderId(provider, providerId);
  let isNewUser = false;

  if (!user) {
    user = await storage.getUserByEmail(email);
    
    if (user) {
      if (user.provider !== provider) {
        user = await storage.updateUser(user.id, {
          provider,
          providerId,
          displayName: displayName || user.displayName,
          avatarUrl: avatarUrl || user.avatarUrl,
        });
      }
    } else {
      user = await storage.createUser({
        email,
        displayName: displayName || email.split("@")[0],
        avatarUrl,
        provider,
        providerId,
      });
      isNewUser = true;
    }
  }

  if (!user) {
    throw new Error("Failed to create or find user");
  }

  const token = generateToken(user.id);
  return { user, token, isNewUser };
}
