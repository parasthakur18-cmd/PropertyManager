#!/usr/bin/env npx tsx
/**
 * Export all lease data (ignores tenant isolation - full DB export).
 * Run: cd /var/www/myapp && npx tsx scripts/export-lease-data.ts
 * Output: lease-export/lease-data-export.json, lease-export/lease-data-export.csv
 */
import { config } from "dotenv";
import { resolve } from "path";
import { writeFileSync, mkdirSync } from "fs";

const root = resolve(process.cwd());
config({ path: resolve(root, ".env") });
config({ path: resolve(root, ".env.local") });

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set.");
    process.exit(1);
  }

  const { propertyLeases, properties, leasePayments } = await import("../shared/schema");
  const { db } = await import("../server/db");
  const { sql, desc } = await import("drizzle-orm");

  const leasesData = await db.select().from(propertyLeases).orderBy(desc(propertyLeases.createdAt));
  const props = await db.select({ id: properties.id, name: properties.name }).from(properties);
  const propMap = Object.fromEntries(props.map((p) => [p.id, p.name]));

  // Total paid per lease (simple query to avoid missing columns in lease_payments)
  const totalsResult = await db.execute(sql`
    select lease_id, coalesce(sum((amount)::numeric), 0) as total_paid
    from lease_payments
    group by lease_id
  `);
  const totalPaidByLease: Record<number, number> = {};
  for (const row of (totalsResult.rows || [])) {
    const r = row as { lease_id: number; total_paid: string };
    totalPaidByLease[r.lease_id] = parseFloat(r.total_paid || "0");
  }

  const rows = leasesData.map((l: any) => {
    const totalPaid = totalPaidByLease[l.id] ?? 0;
    const totalAmount = parseFloat(l.totalAmount || "0");
    return {
      id: l.id,
      propertyId: l.propertyId,
      propertyName: propMap[l.propertyId] || "",
      landlordName: l.landlordName,
      startDate: l.startDate,
      endDate: l.endDate,
      totalAmount: l.totalAmount,
      baseYearlyAmount: l.baseYearlyAmount,
      currentYearAmount: l.currentYearAmount,
      yearlyIncrementType: l.yearlyIncrementType,
      yearlyIncrementValue: l.yearlyIncrementValue,
      leaseDurationYears: l.leaseDurationYears,
      totalPaid,
      pendingBalance: totalAmount - totalPaid,
      isOverridden: l.isOverridden,
      carryForwardAmount: l.carryForwardAmount,
      notes: l.notes,
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
    };
  });

  const outDir = resolve(root, "lease-export");
  try {
    mkdirSync(outDir, { recursive: true });
  } catch (_) {}

  const jsonPath = resolve(outDir, "lease-data-export.json");
  const csvPath = resolve(outDir, "lease-data-export.csv");

  writeFileSync(jsonPath, JSON.stringify(rows, null, 2), "utf-8");
  console.log("Written:", jsonPath);

  const headers = [
    "id", "propertyId", "propertyName", "landlordName", "startDate", "endDate",
    "totalAmount", "baseYearlyAmount", "currentYearAmount", "yearlyIncrementType", "yearlyIncrementValue",
    "leaseDurationYears", "totalPaid", "pendingBalance", "isOverridden", "carryForwardAmount", "notes", "createdAt", "updatedAt"
  ];
  const escape = (v: any) => (v == null ? "" : String(v).replace(/"/g, '""'));
  const csvLines = [headers.join(","), ...rows.map((r: any) => headers.map((h) => `"${escape((r as any)[h])}"`).join(","))];
  writeFileSync(csvPath, csvLines.join("\n"), "utf-8");
  console.log("Written:", csvPath);
  console.log("Total leases:", rows.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
