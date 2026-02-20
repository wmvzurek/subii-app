import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getUserFromRequest } from "@/lib/auth";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  const userId = getUserFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { billingDay } = await req.json();

  if (!billingDay || billingDay < 1 || billingDay > 28) {
    return NextResponse.json(
      { error: "Dzień rozliczeniowy musi być między 1 a 28" },
      { status: 400 }
    );
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { billingDay },
    select: { id: true, billingDay: true }
  });

  return NextResponse.json({ message: "Dzień rozliczeniowy ustawiony", billingDay: user.billingDay });
}

export async function GET(req: Request) {
  const userId = getUserFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { billingDay: true }
  });

  return NextResponse.json({ billingDay: user?.billingDay || null });
}