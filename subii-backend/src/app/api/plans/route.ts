import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function GET() {
  const plans = await prisma.plan.findMany({ where: { country: "PL" } });
  return NextResponse.json({ plans });
}
