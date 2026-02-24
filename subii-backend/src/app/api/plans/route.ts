import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const plans = await prisma.plan.findMany({ where: { country: "PL" } });
  return NextResponse.json({ plans });
}
