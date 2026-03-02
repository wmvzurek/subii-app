import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const adminKey = req.headers.get("x-admin-key");
  if (!adminKey || adminKey !== process.env.ADMIN_SECRET_KEY) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const updatedPlans = [
      { providerCode: "netflix", planName: "Standard z reklamami", pricePLN: 33 },
      { providerCode: "netflix", planName: "Standard", pricePLN: 60 },
      { providerCode: "netflix", planName: "Premium", pricePLN: 80 },
      { providerCode: "disney_plus", planName: "Miesięczny", pricePLN: 37.99 },
      { providerCode: "prime_video", planName: "Prime", pricePLN: 49 },
      { providerCode: "hbo_max", planName: "Basic", pricePLN: 29.99 },
      { providerCode: "hbo_max", planName: "Standard", pricePLN: 39.99 },
      { providerCode: "apple_tv", planName: "Monthly", pricePLN: 34.99 },
    ];

    await Promise.all(
      updatedPlans.map((plan) =>
        prisma.plan.updateMany({
          where: {
            providerCode: plan.providerCode,
            planName: plan.planName,
          },
          data: {
            pricePLN: plan.pricePLN,
            lastVerifiedAt: new Date(),
          },
        })
      )
    );

    return NextResponse.json({
      message: "Plany zaktualizowane",
      updated: updatedPlans.length,
    });
  } catch (error) {
    console.error("[/api/admin/update-plans] error:", error);
    return NextResponse.json({ error: "Błąd aktualizacji" }, { status: 500 });
  }
}