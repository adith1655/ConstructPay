import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function hash(pw: string) {
  return bcrypt.hash(pw, 12);
}

function hoursBetween(a: Date, b: Date) {
  return Math.round(((b.getTime() - a.getTime()) / 3_600_000) * 100) / 100;
}

function day(offset: number, h: number, m = 0) {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  d.setHours(h, m, 0, 0);
  return d;
}

async function main() {
  console.log("Seeding ConstructPay (India edition)…");
  const pw = await hash("Password123!");

  // ---- Platform owner (Super Admin) — single account, no company ----
  await prisma.user.upsert({
    where: { id: "usr_owner" },
    update: { role: "SUPER_ADMIN", companyId: null, active: true },
    create: {
      id: "usr_owner",
      email: "owner@constructpay.in",
      passwordHash: pw,
      fullName: "Aditya Rao",
      role: "SUPER_ADMIN",
      classification: "PAYROLL",
      trade: "Platform Owner",
      hourlyRate: 0,
      companyId: null,
    },
  });

  // ---- Tenant companies ----
  const sentinel = await prisma.company.upsert({
    where: { id: "cmp_sentinel" },
    update: {},
    create: {
      id: "cmp_sentinel",
      name: "Sentinel Infra Pvt Ltd",
      city: "Mumbai",
      gstin: "27AABCS1429B1ZX",
      plan: "Enterprise",
      monthlyFee: 49999,
    },
  });

  const capital = await prisma.company.upsert({
    where: { id: "cmp_capital" },
    update: {},
    create: {
      id: "cmp_capital",
      name: "Capital Buildtech Ltd",
      city: "New Delhi",
      gstin: "07AAGCC4521P1Z9",
      plan: "Growth",
      monthlyFee: 24999,
    },
  });

  // ---- Users ----
  const users = [
    // Sentinel Infra (Mumbai)
    { id: "usr_admin1", email: "admin@sentinelinfra.in", fullName: "Rajesh Khanna", role: "ADMIN", classification: "PAYROLL", trade: "Director — Operations", hourlyRate: 0, companyId: sentinel.id },
    { id: "usr_foreman1", email: "foreman@sentinelinfra.in", fullName: "Meena Iyer", role: "SITE_MANAGER", classification: "PAYROLL", trade: "Site Engineer", hourlyRate: 600, companyId: sentinel.id },
    { id: "usr_worker1", email: "worker@sentinelinfra.in", fullName: "Imran Shaikh", role: "WORKER", classification: "PAYROLL", trade: "Electrician", hourlyRate: 350, companyId: sentinel.id },
    { id: "usr_worker2", email: "carpenter@sentinelinfra.in", fullName: "Suresh Yadav", role: "WORKER", classification: "PAYROLL", trade: "Carpenter", hourlyRate: 300, companyId: sentinel.id },
    { id: "usr_contractor1", email: "welder@sentinelinfra.in", fullName: "Anil Gupta", role: "WORKER", classification: "CONTRACTOR", trade: "Welder", hourlyRate: 450, companyId: sentinel.id, complianceDocsOnFile: false },
    // Capital Buildtech (Delhi)
    { id: "usr_admin2", email: "admin@capitalbuildtech.in", fullName: "Priya Nair", role: "ADMIN", classification: "PAYROLL", trade: "Payroll Director", hourlyRate: 0, companyId: capital.id },
    { id: "usr_foreman2", email: "foreman@capitalbuildtech.in", fullName: "Vikram Singh", role: "SITE_MANAGER", classification: "PAYROLL", trade: "Site Supervisor", hourlyRate: 580, companyId: capital.id },
    { id: "usr_worker3", email: "mason@capitalbuildtech.in", fullName: "Deepak Verma", role: "WORKER", classification: "PAYROLL", trade: "Mason", hourlyRate: 320, companyId: capital.id },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: {
        role: u.role,
        hourlyRate: u.hourlyRate,
        companyId: u.companyId,
        classification: u.classification,
        complianceDocsOnFile: u.complianceDocsOnFile ?? false,
      },
      create: { ...u, passwordHash: pw, complianceDocsOnFile: u.complianceDocsOnFile ?? false },
    });
  }

  // ---- Job sites ----
  const sites = [
    { id: "site_bkc", name: "BKC Commercial Tower", address: "G-Block, Bandra Kurla Complex, Bandra East", city: "Mumbai", latitude: 19.0662, longitude: 72.8694, companyId: sentinel.id },
    { id: "site_worli", name: "Worli Sea-Face Residences", address: "Dr Annie Besant Rd, Worli", city: "Mumbai", latitude: 19.0176, longitude: 72.817, companyId: sentinel.id },
    { id: "site_dwarka", name: "Dwarka Expressway Metro Depot", address: "Sector 21, Dwarka", city: "New Delhi", latitude: 28.5921, longitude: 77.046, companyId: capital.id },
    { id: "site_cp", name: "Connaught Place Retail Retrofit", address: "Block A, Connaught Place", city: "New Delhi", latitude: 28.6315, longitude: 77.2167, companyId: capital.id },
  ];
  for (const s of sites) {
    await prisma.jobSite.upsert({ where: { id: s.id }, update: { companyId: s.companyId }, create: s });
  }

  // ---- Site assignments ----
  const assignments: [string, string][] = [
    ["usr_foreman1", "site_bkc"],
    ["usr_foreman1", "site_worli"],
    ["usr_worker1", "site_bkc"],
    ["usr_worker2", "site_bkc"],
    ["usr_contractor1", "site_worli"],
    ["usr_foreman2", "site_dwarka"],
    ["usr_foreman2", "site_cp"],
    ["usr_worker3", "site_dwarka"],
  ];
  for (const [userId, jobSiteId] of assignments) {
    await prisma.userSite.upsert({
      where: { userId_jobSiteId: { userId, jobSiteId } },
      update: {},
      create: { userId, jobSiteId },
    });
  }

  // ---- Projects ----
  const projects = [
    { id: "proj_bkc", name: "BKC Tower — Phase 1", contractValue: 45_00_00_000, companyId: sentinel.id, jobSiteId: "site_bkc", startDate: new Date("2026-01-15"), endDate: new Date("2026-12-20") },
    { id: "proj_worli", name: "Worli Residences — Tower A", contractValue: 92_00_00_000, companyId: sentinel.id, jobSiteId: "site_worli", startDate: new Date("2026-03-01"), endDate: new Date("2027-06-30") },
    { id: "proj_dwarka", name: "Dwarka Metro Depot — Civil", contractValue: 1_20_00_00_000, companyId: capital.id, jobSiteId: "site_dwarka", startDate: new Date("2026-02-10"), endDate: new Date("2027-09-30") },
  ];
  for (const p of projects) {
    await prisma.project.upsert({ where: { id: p.id }, update: { companyId: p.companyId }, create: p });
  }

  // ---- Cost codes ----
  const costCodes = [
    { id: "cc_concrete", code: "RCC-300", description: "Cast-in-Situ RCC Concrete", projectId: "proj_bkc", jobSiteId: "site_bkc", budgetHours: 1200, budgetCost: 65_00_000 },
    { id: "cc_elec", code: "ELE-500", description: "Electrical Rough-In", projectId: "proj_bkc", jobSiteId: "site_bkc", budgetHours: 900, budgetCost: 52_00_000 },
    { id: "cc_carp", code: "CRP-100", description: "Formwork & Carpentry", projectId: "proj_bkc", jobSiteId: "site_bkc", budgetHours: 700, budgetCost: 38_00_000 },
    { id: "cc_weld", code: "STL-120", description: "Structural Steel Welding", projectId: "proj_worli", jobSiteId: "site_worli", budgetHours: 1500, budgetCost: 1_20_00_000 },
    { id: "cc_mason", code: "MAS-200", description: "Brick & Block Masonry", projectId: "proj_dwarka", jobSiteId: "site_dwarka", budgetHours: 1000, budgetCost: 60_00_000 },
  ];
  for (const c of costCodes) {
    await prisma.costCode.upsert({ where: { id: c.id }, update: {}, create: c });
  }

  // ---- Time entries (history) ----
  const entries = [
    { id: "te_1", userId: "usr_worker1", jobSiteId: "site_bkc", costCodeId: "cc_elec", inH: 8, outH: 17, offset: 3, status: "APPROVED", approvedById: "usr_foreman1" },
    { id: "te_2", userId: "usr_worker1", jobSiteId: "site_bkc", costCodeId: "cc_elec", inH: 8, outH: 18, offset: 2, status: "APPROVED", approvedById: "usr_foreman1" },
    { id: "te_3", userId: "usr_worker1", jobSiteId: "site_bkc", costCodeId: "cc_elec", inH: 8, outH: 17, offset: 1, status: "PENDING", approvedById: null },
    { id: "te_4", userId: "usr_worker2", jobSiteId: "site_bkc", costCodeId: "cc_carp", inH: 7, outH: 16, offset: 2, status: "APPROVED", approvedById: "usr_foreman1" },
    { id: "te_5", userId: "usr_worker2", jobSiteId: "site_bkc", costCodeId: "cc_concrete", inH: 8, outH: 17, offset: 1, status: "PENDING", approvedById: null },
    { id: "te_6", userId: "usr_contractor1", jobSiteId: "site_worli", costCodeId: "cc_weld", inH: 9, outH: 19, offset: 1, status: "PENDING", approvedById: null },
    { id: "te_7", userId: "usr_worker3", jobSiteId: "site_dwarka", costCodeId: "cc_mason", inH: 8, outH: 17, offset: 2, status: "APPROVED", approvedById: "usr_foreman2" },
    { id: "te_8", userId: "usr_worker3", jobSiteId: "site_dwarka", costCodeId: "cc_mason", inH: 8, outH: 18, offset: 1, status: "PENDING", approvedById: null },
  ];
  for (const e of entries) {
    const clockIn = day(e.offset, e.inH);
    const clockOut = day(e.offset, e.outH);
    const data = {
      userId: e.userId,
      jobSiteId: e.jobSiteId,
      costCodeId: e.costCodeId,
      clockIn,
      clockOut,
      hours: hoursBetween(clockIn, clockOut),
      status: e.status,
      approvedById: e.approvedById,
    };
    await prisma.timeEntry.upsert({ where: { id: e.id }, update: data, create: { id: e.id, ...data } });
  }

  // ---- Daily site report ----
  await prisma.dailySiteReport.upsert({
    where: { id: "dsr_1" },
    update: {},
    create: {
      id: "dsr_1",
      jobSiteId: "site_bkc",
      userId: "usr_foreman1",
      weather: "Clear",
      temperature: 33,
      safetyIncident: false,
      notes: "Slab pour completed on Level 4. BMC inspector signed off. No incidents.",
    },
  });

  // ---- Inventory catalog & site stock ----
  const invItems = [
    { id: "inv_cement", name: "Cement OPC 53 Grade", sku: "CEM-OPC53", unitOfMeasure: "Bags", minStockLevel: 100 },
    { id: "inv_steel", name: "TMT Steel 12mm", sku: "STL-TMT12", unitOfMeasure: "MT", minStockLevel: 5 },
    { id: "inv_sand", name: "River Sand (Fine)", sku: "SND-FINE", unitOfMeasure: "CUM", minStockLevel: 20 },
    { id: "inv_brick", name: "Fly Ash Bricks", sku: "BRK-FLY", unitOfMeasure: "Nos", minStockLevel: 5000 },
  ];
  for (const item of invItems) {
    await prisma.inventoryItem.upsert({ where: { id: item.id }, update: {}, create: item });
  }

  const siteStock = [
    { jobSiteId: "site_bkc", inventoryItemId: "inv_cement", quantityAvailable: 250 },
    { jobSiteId: "site_bkc", inventoryItemId: "inv_steel", quantityAvailable: 12 },
    { jobSiteId: "site_bkc", inventoryItemId: "inv_sand", quantityAvailable: 45 },
    { jobSiteId: "site_worli", inventoryItemId: "inv_steel", quantityAvailable: 8 },
    { jobSiteId: "site_dwarka", inventoryItemId: "inv_brick", quantityAvailable: 12000 },
    { jobSiteId: "site_dwarka", inventoryItemId: "inv_cement", quantityAvailable: 80 },
  ];
  for (const s of siteStock) {
    await prisma.siteInventory.upsert({
      where: { jobSiteId_inventoryItemId: { jobSiteId: s.jobSiteId, inventoryItemId: s.inventoryItemId } },
      update: { quantityAvailable: s.quantityAvailable },
      create: s,
    });
  }

  await prisma.jobSite.update({
    where: { id: "site_bkc" },
    data: { budgetLimit: 2_00_00_000 },
  });

  // ---- Access requests (new businesses wanting a subscription) ----
  const requests = [
    { id: "ar_1", fullName: "Kunal Mehta", businessName: "Mehta Constructions LLP", roleRequested: "ADMIN", email: "kunal@mehtaconstructions.in", phone: "+91 98200 11223", city: "Mumbai", employees: "51-100", useCase: "Statutory PF/ESI payroll for two metro projects in Mumbai." },
    { id: "ar_2", fullName: "Sneha Reddy", businessName: "Skyline Builders India", roleRequested: "ADMIN", email: "sneha@skylinebuilders.in", phone: "+91 99100 44556", city: "New Delhi", employees: "100+", useCase: "Replacing paper muster rolls across 4 Delhi-NCR sites." },
  ];
  for (const r of requests) {
    await prisma.accessRequest.upsert({ where: { id: r.id }, update: {}, create: r });
  }

  console.log("Seed complete.\n");
  console.log("Demo logins (password: Password123!):");
  console.log("  Platform Owner (Super Admin) -> owner@constructpay.in");
  console.log("  Company Admin (Mumbai)        -> admin@sentinelinfra.in");
  console.log("  Site Manager                  -> foreman@sentinelinfra.in");
  console.log("  Worker                        -> worker@sentinelinfra.in");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
