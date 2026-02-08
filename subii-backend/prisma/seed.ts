import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // 1) PROVIDERS
  await prisma.provider.createMany({
    data: [
      { code: "netflix", name: "Netflix", website: "https://netflix.com" },
      { code: "disney_plus", name: "Disney+", website: "https://disneyplus.com" },
      { code: "prime_video", name: "Prime Video", website: "https://primevideo.com" },
      { code: "hbo_max", name: "Max", website: "https://max.com" },
      { code: "apple_tv", name: "Apple TV+", website: "https://tv.apple.com" },
    ],
  });

  // 2) PLANS
  await prisma.plan.createMany({
    data: [
      // Netflix
      { providerCode: "netflix", planName: "Standard z reklamami", pricePLN: 33, cycle: "monthly", screens: 2, uhd: false, ads: true },
      { providerCode: "netflix", planName: "Standard", pricePLN: 60, cycle: "monthly", screens: 2, uhd: false, ads: false },
      { providerCode: "netflix", planName: "Premium", pricePLN: 80, cycle: "monthly", screens: 4, uhd: true, ads: false },
      
      // Disney+
      { providerCode: "disney_plus", planName: "Miesięczny", pricePLN: 37.99, cycle: "monthly", screens: 4, uhd: true, ads: false },
      
      // Prime Video
      { providerCode: "prime_video", planName: "Prime", pricePLN: 49, cycle: "monthly", screens: 3, uhd: true, ads: false },
      
      // Max
      { providerCode: "hbo_max", planName: "Basic", pricePLN: 29.99, cycle: "monthly", screens: 2, uhd: false, ads: true },
      { providerCode: "hbo_max", planName: "Standard", pricePLN: 39.99, cycle: "monthly", screens: 2, uhd: true, ads: false },
      
      // Apple TV+
      { providerCode: "apple_tv", planName: "Monthly", pricePLN: 34.99, cycle: "monthly", screens: 6, uhd: true, ads: false },
    ],
  });

  // 3) DEMO USER
  const hashedPassword = await bcrypt.hash("haslo123", 10);
  
  const user = await prisma.user.create({
    data: {
      email: "anna@test.pl",
      passwordHash: hashedPassword,
      firstName: "Anna",
      lastName: "Kowalska",
      username: "anna_k",
      dateOfBirth: new Date("1995-05-15"),
      phone: "+48123456789",
    },
  });

  // 4) DEMO SUBSCRIPTIONS dla tego usera
  const netflixPlan = await prisma.plan.findFirst({ where: { providerCode: "netflix", planName: "Standard" } });
  const disneyPlan = await prisma.plan.findFirst({ where: { providerCode: "disney_plus" } });

  if (netflixPlan) {
    await prisma.subscription.create({
      data: {
        userId: user.id,
        providerCode: "netflix",
        planId: netflixPlan.id,
        nextDueDate: new Date("2025-03-15"),
        status: "active",
      },
    });
  }

  if (disneyPlan) {
    await prisma.subscription.create({
      data: {
        userId: user.id,
        providerCode: "disney_plus",
        planId: disneyPlan.id,
        nextDueDate: new Date("2025-03-20"),
        status: "active",
      },
    });
  }

  console.log("✅ Seed completed!");
  console.log("📧 Demo user: anna@test.pl / haslo123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());