import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding ConstructPay (minimal bootstrap)…");

  const superEmail = process.env.SUPER_ADMIN_GOOGLE_EMAIL?.toLowerCase();
  if (superEmail) {
    await prisma.user.upsert({
      where: { email: superEmail },
      update: {
        role: "SUPER_ADMIN",
        fullName: "Adith Nambiar",
        googleOAuthEnabled: true,
        active: true,
        companyId: null,
      },
      create: {
        email: superEmail,
        fullName: "Adith Nambiar",
        role: "SUPER_ADMIN",
        googleOAuthEnabled: true,
        active: true,
        companyId: null,
      },
    });
    console.log(`Super Admin stub ready for Google: ${superEmail}`);
  } else {
    console.log("SUPER_ADMIN_GOOGLE_EMAIL not set — skip Super Admin bootstrap.");
  }

  // Sample pending access requests for platform owner demo (no user accounts)
  const requests = [
    {
      id: "ar_1",
      fullName: "Kunal Mehta",
      businessName: "Mehta Constructions LLP",
      roleRequested: "ADMIN",
      email: "kunal@mehtaconstructions.in",
      phone: "+91 98200 11223",
      city: "Mumbai",
      employees: "51-100",
      useCase: "Statutory PF/ESI payroll for two metro projects in Mumbai.",
    },
    {
      id: "ar_2",
      fullName: "Sneha Reddy",
      businessName: "Skyline Builders India",
      roleRequested: "ADMIN",
      email: "sneha@skylinebuilders.in",
      phone: "+91 99100 44556",
      city: "New Delhi",
      employees: "100+",
      useCase: "Replacing paper muster rolls across 4 Delhi-NCR sites.",
    },
  ];
  for (const r of requests) {
    await prisma.accessRequest.upsert({ where: { id: r.id }, update: {}, create: r });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
