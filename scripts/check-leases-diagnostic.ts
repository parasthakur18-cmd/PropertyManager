#!/usr/bin/env npx tsx
/**
 * VPS diagnostic: why is there no data in lease?
 * Run from app root: npx tsx scripts/check-leases-diagnostic.ts
 * Uses DATABASE_URL from .env or .env.local
 */
import { config } from "dotenv";
import { resolve } from "path";

// Load env from app root
const root = resolve(process.cwd());
config({ path: resolve(root, ".env") });
config({ path: resolve(root, ".env.local") });

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Set it in .env or .env.local or environment.");
    process.exit(1);
  }

  const { db } = await import("../server/db");
  const { propertyLeases, properties, users } = await import("../shared/schema");
  const { sql, desc } = await import("drizzle-orm");

  console.log("\n=== Lease data diagnostic ===\n");

  // 1) Count leases in DB
  const leaseCountResult = await db.select({ count: sql<number>`count(*)::int` }).from(propertyLeases);
  const leaseCount = leaseCountResult[0]?.count ?? 0;
  console.log("1. property_leases table:");
  console.log("   Total rows:", leaseCount);

  if (leaseCount > 0) {
    const rows = await db.select({
      id: propertyLeases.id,
      propertyId: propertyLeases.propertyId,
      landlordName: propertyLeases.landlordName,
      startDate: propertyLeases.startDate,
    })
      .from(propertyLeases)
      .orderBy(desc(propertyLeases.createdAt))
      .limit(10);
    console.log("   Sample (up to 10):", JSON.stringify(rows, null, 2));
  }

  // 2) Properties that have leases
  if (leaseCount > 0) {
    const propertyIds = await db.selectDistinct({ propertyId: propertyLeases.propertyId }).from(propertyLeases);
    console.log("\n2. Property IDs that have leases:", propertyIds.map((r) => r.propertyId).join(", "));
    const props = await db.select({ id: properties.id, name: properties.name }).from(properties);
    console.log("   All properties (id, name):", props.map((p) => `${p.id}:${p.name}`).join(", "));
  }

  // 3) Users: role and assigned properties (tenant isolation)
  const userRows = await db.select({
    id: users.id,
    email: users.email,
    role: users.role,
    assignedPropertyIds: users.assignedPropertyIds,
  }).from(users).limit(20);
  console.log("\n3. Users (role & assigned properties) – first 20:");
  for (const u of userRows) {
    const assigned = Array.isArray(u.assignedPropertyIds) ? u.assignedPropertyIds : [];
    const hasUnlimited = u.role === "super-admin";
    const canSeeLeases = hasUnlimited || (assigned.length > 0);
    console.log(`   ${u.email} role=${u.role} assignedPropertyIds=[${assigned.join(",")}] => canSeeLeases=${canSeeLeases}`);
  }

  // 4) Conclusion
  console.log("\n=== Conclusion ===");
  if (leaseCount === 0) {
    console.log("No lease rows in the database. Add leases via the app (Leases → Add Lease).");
  } else {
    const superAdmins = userRows.filter((u) => u.role === "super-admin");
    const nonSuperAdmins = userRows.filter((u) => u.role !== "super-admin");
    const withNoAccess = nonSuperAdmins.filter((u) => {
      const ids = Array.isArray(u.assignedPropertyIds) ? u.assignedPropertyIds : [];
      return ids.length === 0;
    });
    if (withNoAccess.length > 0) {
      console.log("Some users have no assigned properties, so they will see 0 leases:");
      withNoAccess.forEach((u) => console.log("  -", u.email));
    }
    if (superAdmins.length === 0 && nonSuperAdmins.some((u) => {
      const ids = Array.isArray(u.assignedPropertyIds) ? u.assignedPropertyIds : [];
      return ids.length === 0;
    })) {
      console.log("Ensure the user you log in with has role 'super-admin' OR has assignedPropertyIds set to the property IDs that have leases.");
    }
  }
  console.log("");
  process.exit(0);
}

main().catch((err) => {
  console.error("Diagnostic failed:", err);
  process.exit(1);
});
