import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // 1) PROVIDERS
  const providers = [
  { code: "netflix", name: "Netflix", website: "https://netflix.com", logoUrl: "/providers/netflix.png" },
  { code: "disney_plus", name: "Disney+", website: "https://disneyplus.com", logoUrl: "/providers/disney_plus.png" },
  { code: "prime_video", name: "Prime Video", website: "https://primevideo.com", logoUrl: "/providers/prime_video.png" },
  { code: "hbo_max", name: "HBO Max", website: "https://max.com", logoUrl: "/providers/hbo_max.png" },
  { code: "apple_tv", name: "Apple TV+", website: "https://tv.apple.com", logoUrl: "/providers/apple_tv.png" },
];

  for (const provider of providers) {
    await prisma.provider.upsert({
      where: { code: provider.code },
      update: provider,
      create: provider,
    });
  }
  console.log("✅ Providers seeded");

  // 2) PLANS
  // Zaktualizowane dane planów streamingowych - Polska, luty 2026
const plans = [
  // NETFLIX (3 plany)
  { providerCode: "netflix", planName: "Basic", pricePLN: 33, cycle: "monthly", screens: 1, uhd: false, ads: false },
  { providerCode: "netflix", planName: "Standard", pricePLN: 49, cycle: "monthly", screens: 2, uhd: false, ads: false },
  { providerCode: "netflix", planName: "Premium", pricePLN: 67, cycle: "monthly", screens: 4, uhd: true, ads: false },

  // DISNEY+ (2 plany podstawowe)
  { providerCode: "disney_plus", planName: "Standard", pricePLN: 34.99, cycle: "monthly", screens: 2, uhd: false, ads: false },
  { providerCode: "disney_plus", planName: "Premium", pricePLN: 59.99, cycle: "monthly", screens: 4, uhd: true, ads: false },

  // PRIME VIDEO / AMAZON PRIME (2 warianty)
  { providerCode: "prime_video", planName: "Prime Video miesięczny", pricePLN: 15.50, cycle: "monthly", screens: 3, uhd: true, ads: false },
  { providerCode: "prime_video", planName: "Prime Video roczny", pricePLN: 69, cycle: "yearly", screens: 3, uhd: true, ads: false },

  // HBO MAX (3 plany)
  { providerCode: "hbo_max", planName: "Basic (z reklamami)", pricePLN: 29.99, cycle: "monthly", screens: 2, uhd: false, ads: true },
  { providerCode: "hbo_max", planName: "Standard", pricePLN: 39.99, cycle: "monthly", screens: 2, uhd: false, ads: false },
  { providerCode: "hbo_max", planName: "Premium", pricePLN: 49.99, cycle: "monthly", screens: 4, uhd: true, ads: false },

  // APPLE TV+ (1 główny plan)
  { providerCode: "apple_tv", planName: "Apple TV+ miesięczny", pricePLN: 34.99, cycle: "monthly", screens: 6, uhd: true, ads: false },
  // Apple TV+ nie ma oficjalnej standardowej oferty „rocznej” osobno – zwykle dostępne są promocje lub pakiety Apple One

];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { 
        providerCode_planName: { 
          providerCode: plan.providerCode, 
          planName: plan.planName 
        } 
      },
      update: { 
        pricePLN: plan.pricePLN,
        cycle: plan.cycle,
        screens: plan.screens,
        uhd: plan.uhd,
        ads: plan.ads,
        lastVerifiedAt: new Date()
      },
      create: plan,
    });
  }
  console.log("✅ Plans seeded");

  // 3) DEMO USER
  const hashedPassword = await bcrypt.hash("haslo123", 10);
  
  const user = await prisma.user.upsert({
    where: { email: "anna@test.pl" },
    update: {},
    create: {
      email: "anna@test.pl",
      passwordHash: hashedPassword,
      firstName: "Anna",
      lastName: "Kowalska",
      dateOfBirth: new Date("1995-05-15"),
      phone: "123456789",
      emailVerified: true,
      billingDay: 10,
    },
  });
  console.log("✅ Demo user created/updated");

  // 4) WALLET
  await prisma.wallet.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      balance: 0,
    },
  });
  console.log("✅ Wallet created for Anna");

  // 5) DEMO SUBSCRIPTIONS
  const netflixPlan = await prisma.plan.findFirst({ 
    where: { providerCode: "netflix", planName: "Standard" } 
  });
  
  const disneyPlan = await prisma.plan.findFirst({ 
    where: { providerCode: "disney_plus" } 
  });

  if (netflixPlan) {
    const existingNetflix = await prisma.subscription.findFirst({
      where: { userId: user.id, providerCode: "netflix" }
    });

    if (!existingNetflix) {
      await prisma.subscription.create({
  data: {
    userId: user.id,
    providerCode: "netflix",
    planId: netflixPlan.id,
    renewalDay: 17,
    status: "active",
  },
});
      console.log("✅ Netflix subscription created");
    } else {
      console.log("ℹ️  Netflix subscription already exists");
    }
  }

  if (disneyPlan) {
    const existingDisney = await prisma.subscription.findFirst({
      where: { userId: user.id, providerCode: "disney_plus" }
    });

    if (!existingDisney) {
      await prisma.subscription.create({
  data: {
    userId: user.id,
    providerCode: "disney_plus",
    planId: disneyPlan.id,
    renewalDay: 27,
    status: "active",
  },
});
      console.log("✅ Disney+ subscription created");
    } else {
      console.log("ℹ️  Disney+ subscription already exists");
    }
  }

  console.log("\n✅ Seed completed!");
  console.log("📧 Demo user: anna@test.pl / haslo123");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());