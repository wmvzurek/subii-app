import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // 1) PROVIDERS
  const providers = [
    { code: "netflix", name: "Netflix", website: "https://netflix.com" },
    { code: "disney_plus", name: "Disney+", website: "https://disneyplus.com" },
    { code: "prime_video", name: "Prime Video", website: "https://primevideo.com" },
    { code: "hbo_max", name: "Max", website: "https://max.com" },
    { code: "apple_tv", name: "Apple TV+", website: "https://tv.apple.com" },
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
  const plans = [
    { providerCode: "netflix", planName: "Standard z reklamami", pricePLN: 33, cycle: "monthly", screens: 2, uhd: false, ads: true },
    { providerCode: "netflix", planName: "Standard", pricePLN: 60, cycle: "monthly", screens: 2, uhd: false, ads: false },
    { providerCode: "netflix", planName: "Premium", pricePLN: 80, cycle: "monthly", screens: 4, uhd: true, ads: false },
    { providerCode: "disney_plus", planName: "Miesięczny", pricePLN: 37.99, cycle: "monthly", screens: 4, uhd: true, ads: false },
    { providerCode: "prime_video", planName: "Prime", pricePLN: 49, cycle: "monthly", screens: 3, uhd: true, ads: false },
    { providerCode: "hbo_max", planName: "Basic", pricePLN: 29.99, cycle: "monthly", screens: 2, uhd: false, ads: true },
    { providerCode: "hbo_max", planName: "Standard", pricePLN: 39.99, cycle: "monthly", screens: 2, uhd: true, ads: false },
    { providerCode: "apple_tv", planName: "Monthly", pricePLN: 34.99, cycle: "monthly", screens: 6, uhd: true, ads: false },
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
          nextDueDate: new Date("2025-03-15"),
          status: "active",
          activatedAt: new Date(),
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
          nextDueDate: new Date("2025-03-20"),
          status: "active",
          activatedAt: new Date(),
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