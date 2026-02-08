import { PrismaClient, Prisma } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const data: Prisma.PlanCreateInput[] = [
    { providerCode: "netflix", planName: "Standard",   pricePLN: 29.99, screens: 2, uhd: true,  ads: false },
    { providerCode: "disney_plus", planName: "Miesięczny", pricePLN: 27.99, screens: 4, uhd: true,  ads: false },
    { providerCode: "prime_video", planName: "Prime",      pricePLN: 49.00, screens: 3, uhd: true,  ads: false },
  ];

  for (const d of data) {
    await prisma.plan.upsert({
      where: { providerCode_planName: { providerCode: d.providerCode, planName: d.planName } },
      update: d,
      create: d,
    });
  }

  console.log("✅ Seed OK");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
