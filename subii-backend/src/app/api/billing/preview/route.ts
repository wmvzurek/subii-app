import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { calculateBillingPreview } from "@/lib/billing";

export async function GET(req: Request) {
  const userId = getUserFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const preview = await calculateBillingPreview(userId);

  if (!preview) {
    return NextResponse.json(
      { error: "Brak ustawionego dnia rozliczeniowego" },
      { status: 400 }
    );
  }

  return NextResponse.json(preview);
}