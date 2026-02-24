import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("KRYTYCZNY BŁĄD: Zmienna środowiskowa JWT_SECRET nie jest ustawiona! Ustaw ją w pliku .env");
}

const SECRET: string = JWT_SECRET;

export type JWTPayload = {
  userId: number;
  email: string;
  type?: string;
  tokenVersion?: number;
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: JWTPayload): string {
  const expiresIn = payload.type === 'verification' || payload.type === 'password_reset' ? '24h' : '7d';
  return jwt.sign(payload, SECRET, { expiresIn });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export async function getUserFromRequest(req: Request): Promise<number | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  
  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  if (!payload?.userId) return null;

  // Pomiń weryfikację wersji dla tokenów weryfikacyjnych i resetowania hasła
  if (payload.type === 'verification' || payload.type === 'password_reset') {
    return payload.userId;
  }

  // Sprawdź czy tokenVersion zgadza się z bazą
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  const user = await prisma.user.findUnique({ 
    where: { id: payload.userId },
    select: { tokenVersion: true }
  });

  if (!user || user.tokenVersion !== (payload.tokenVersion ?? 0)) {
    return null; // token unieważniony
  }

  return payload.userId;
}