// src/lib/auth.ts
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-CHANGE-ME";

export type JWTPayload = {
  userId: number;
  email: string;
};

// Hashowanie hasła
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Weryfikacja hasła
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Generowanie JWT
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

// Weryfikacja JWT
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

// Middleware do Next.js API routes - wyciąga userId z tokena
export function getUserFromRequest(req: Request): number | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  
  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  return payload?.userId || null;
}