import * as bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();


async function main() {
  console.log("🌱 Starting seed...");

  // 1) PROVIDERS
  const providers = [
  { code: "netflix",        name: "Netflix",        website: "https://netflix.com",          logoUrl: "/providers/netflix.png" },
  { code: "hbo_max",        name: "HBO Max",         website: "https://hbomax.com/pl/pl",     logoUrl: "/providers/hbo_max.png" },
  { code: "disney_plus",    name: "Disney+",         website: "https://disneyplus.com",       logoUrl: "/providers/disney_plus.png" },
  { code: "canal_plus",     name: "Canal+",          website: "https://pl.canalplus.com",     logoUrl: "/providers/canal_plus.png" },
  { code: "prime_video",    name: "Prime Video",     website: "https://primevideo.com",       logoUrl: "/providers/prime_video.png" },
  { code: "apple_tv",       name: "Apple TV+",       website: "https://tv.apple.com",         logoUrl: "/providers/apple_tv.png" },
  { code: "skyshowtime",    name: "SkyShowtime",     website: "https://skyshowtime.com",      logoUrl: "/providers/skyshowtime.png" },
  { code: "polsat_box_go",  name: "Polsat Box Go",   website: "https://polsatboxgo.pl",       logoUrl: "/providers/polsat_box_go.png" },
  { code: "player",         name: "Player",          website: "https://player.pl",            logoUrl: "/providers/player.png" },
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
  // ─── NETFLIX ───────────────────────────────────────────────
  { providerCode: "netflix", planName: "Podstawowy", pricePLN: 33, cycle: "monthly", screens: 1, uhd: false, ads: false },
  { providerCode: "netflix", planName: "Standard",   pricePLN: 49, cycle: "monthly", screens: 2, uhd: false, ads: false },
  { providerCode: "netflix", planName: "Premium",    pricePLN: 67, cycle: "monthly", screens: 4, uhd: true,  ads: false },

  // ─── HBO MAX ────────────────────────────────────────────────
  { providerCode: "hbo_max", planName: "Podstawowy",        pricePLN: 29.99, cycle: "monthly", screens: 2, uhd: false, ads: true  },
  { providerCode: "hbo_max", planName: "Standard",          pricePLN: 39.99, cycle: "monthly", screens: 2, uhd: false, ads: false },
  { providerCode: "hbo_max", planName: "Premium",           pricePLN: 49.99, cycle: "monthly", screens: 4, uhd: true,  ads: false },
  { providerCode: "hbo_max", planName: "Podstawowy roczny", pricePLN: 299,   cycle: "yearly",  screens: 2, uhd: false, ads: true  },
  { providerCode: "hbo_max", planName: "Standard roczny",   pricePLN: 399,   cycle: "yearly",  screens: 2, uhd: false, ads: false },
  { providerCode: "hbo_max", planName: "Premium roczny",    pricePLN: 499,   cycle: "yearly",  screens: 4, uhd: true,  ads: false },

  // ─── DISNEY+ ────────────────────────────────────────────────
  { providerCode: "disney_plus", planName: "Standard",        pricePLN: 34.99,  cycle: "monthly", screens: 2, uhd: false, ads: false },
  { providerCode: "disney_plus", planName: "Premium",         pricePLN: 59.99,  cycle: "monthly", screens: 4, uhd: true,  ads: false },
  { providerCode: "disney_plus", planName: "Standard roczny", pricePLN: 349.90, cycle: "yearly",  screens: 2, uhd: false, ads: false },
  { providerCode: "disney_plus", planName: "Premium roczny",  pricePLN: 599.90, cycle: "yearly",  screens: 4, uhd: true,  ads: false },

  // ─── CANAL+ ─────────────────────────────────────────────────
  // (w serwisie CANAL+ Online: aktualnie oferta miesięczna; roczne usuń)
  { providerCode: "canal_plus", planName: "Seriale i Filmy", pricePLN: 29, cycle: "monthly", screens: 2, uhd: false, ads: false },
  { providerCode: "canal_plus", planName: "Super Sport",     pricePLN: 69, cycle: "monthly", screens: 2, uhd: false, ads: false },

  // ─── PRIME VIDEO ────────────────────────────────────────────
  { providerCode: "prime_video", planName: "Miesięczny", pricePLN: 10.99, cycle: "monthly", screens: 3, uhd: true, ads: false },
  { providerCode: "prime_video", planName: "Roczny",     pricePLN: 49,    cycle: "yearly",  screens: 3, uhd: true, ads: false },

  // ─── APPLE TV+ ──────────────────────────────────────────────
  { providerCode: "apple_tv", planName: "Apple TV+", pricePLN: 34.99, cycle: "monthly", screens: 6, uhd: true, ads: false },

  // ─── SKYSHOWTIME ────────────────────────────────────────────
  // Standard z reklamami: 1 ekran; Standard: 2 ekrany; Premium: 5 ekranów
  { providerCode: "skyshowtime", planName: "Standard z reklamami",        pricePLN: 19.99,  cycle: "monthly", screens: 1, uhd: false, ads: true  },
  { providerCode: "skyshowtime", planName: "Standard",                    pricePLN: 24.99,  cycle: "monthly", screens: 2, uhd: false, ads: false },
  { providerCode: "skyshowtime", planName: "Premium",                     pricePLN: 49.99,  cycle: "monthly", screens: 5, uhd: true,  ads: false },
  { providerCode: "skyshowtime", planName: "Standard z reklamami roczny", pricePLN: 159.99, cycle: "yearly",  screens: 1, uhd: false, ads: true  },
  { providerCode: "skyshowtime", planName: "Standard roczny",             pricePLN: 198.99, cycle: "yearly",  screens: 2, uhd: false, ads: false },
  { providerCode: "skyshowtime", planName: "Premium roczny",              pricePLN: 398.99, cycle: "yearly",  screens: 5, uhd: true,  ads: false },

  // ─── POLSAT BOX GO ──────────────────────────────────────────
  { providerCode: "polsat_box_go", planName: "Start",         pricePLN: 5,  cycle: "monthly", screens: 1, uhd: false, ads: true  },
  { providerCode: "polsat_box_go", planName: "Polsat Lovers", pricePLN: 20, cycle: "monthly", screens: 3, uhd: false, ads: false },
  { providerCode: "polsat_box_go", planName: "Premium",       pricePLN: 30, cycle: "monthly", screens: 3, uhd: false, ads: false },
  { providerCode: "polsat_box_go", planName: "Premium Sport", pricePLN: 50, cycle: "monthly", screens: 3, uhd: false, ads: false },

  // ─── PLAYER ─────────────────────────────────────────────────
  { providerCode: "player", planName: "Bez reklam",     pricePLN: 25,  cycle: "monthly", screens: 1, uhd: false, ads: false },
  { providerCode: "player", planName: "Bez reklam rok", pricePLN: 225, cycle: "yearly",  screens: 1, uhd: false, ads: false },
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
      const netflixRenewal = new Date();
netflixRenewal.setMonth(netflixRenewal.getMonth() + 1);

await prisma.subscription.create({
  data: {
    userId: user.id,
    providerCode: "netflix",
    planId: netflixPlan.id,
    nextRenewalDate: netflixRenewal,
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
      const disneyRenewal = new Date();
disneyRenewal.setMonth(disneyRenewal.getMonth() + 1);

await prisma.subscription.create({
  data: {
    userId: user.id,
    providerCode: "disney_plus",
    planId: disneyPlan.id,
    nextRenewalDate: disneyRenewal,
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