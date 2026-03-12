import { pool } from "./db";

interface MigrationResult {
  name: string;
  applied: boolean;
  skipped: boolean;
  error?: string;
}

async function runRaw(sql: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(sql);
  } finally {
    client.release();
  }
}

async function getColumnType(table: string, column: string): Promise<string | null> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT data_type FROM information_schema.columns
       WHERE table_name = $1 AND column_name = $2`,
      [table, column]
    );
    return result.rows[0]?.data_type ?? null;
  } finally {
    client.release();
  }
}

async function columnExists(table: string, column: string): Promise<boolean> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_name = $1 AND column_name = $2`,
      [table, column]
    );
    return result.rows.length > 0;
  } finally {
    client.release();
  }
}

async function tableExists(table: string): Promise<boolean> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT 1 FROM information_schema.tables
       WHERE table_name = $1`,
      [table]
    );
    return result.rows.length > 0;
  } finally {
    client.release();
  }
}

const migrations: Array<{ name: string; run: () => Promise<void> }> = [
  {
    // The db-validator originally created aiosell_rate_plans with an old schema
    // (aiosell_rate_plan_id, hostezee_room_id, sync_enabled) that doesn't match
    // the Drizzle schema (config_id, room_mapping_id, rate_plan_name, rate_plan_code).
    // This migration detects the old schema and rebuilds the table correctly.
    name: "rebuild_aiosell_rate_plans_schema",
    async run() {
      if (!(await tableExists("aiosell_rate_plans"))) return;
      // Detect old schema by checking for the new required column.
      // Old variants had: aiosell_rate_plan_id, hostezee_room_id, sync_enabled
      // New schema has: config_id, room_mapping_id, rate_plan_name, rate_plan_code
      // If config_id is missing → old schema → rebuild.
      const hasNewSchema = await columnExists("aiosell_rate_plans", "config_id");
      if (hasNewSchema) return; // already correct schema, nothing to do
      await runRaw(`
        DROP TABLE IF EXISTS aiosell_rate_plans CASCADE;
        CREATE TABLE aiosell_rate_plans (
          id SERIAL PRIMARY KEY,
          config_id INTEGER NOT NULL,
          property_id INTEGER NOT NULL,
          room_mapping_id INTEGER NOT NULL,
          rate_plan_name VARCHAR(100) NOT NULL,
          rate_plan_code VARCHAR(100) NOT NULL,
          base_rate DECIMAL(10,2),
          occupancy VARCHAR(20) DEFAULT 'single',
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
    },
  },
  {
    name: "fix_aiosell_rate_plans_occupancy_type",
    async run() {
      if (!(await tableExists("aiosell_rate_plans"))) return;
      const colType = await getColumnType("aiosell_rate_plans", "occupancy");
      if (!colType) return;
      if (colType === "integer") {
        await runRaw(`
          ALTER TABLE aiosell_rate_plans
            ALTER COLUMN occupancy TYPE varchar(20)
            USING CASE
              WHEN occupancy IS NULL THEN 'single'
              WHEN occupancy::text = '2' THEN 'double'
              WHEN occupancy::text = '3' THEN 'triple'
              ELSE 'single'
            END
        `);
      }
      // If it already exists as character varying, do nothing
    },
  },
  {
    name: "add_aiosell_room_mappings_hostezee_room_id",
    async run() {
      if (!(await tableExists("aiosell_room_mappings"))) return;
      if (await columnExists("aiosell_room_mappings", "hostezee_room_id")) return;
      await runRaw(`
        ALTER TABLE aiosell_room_mappings
          ADD COLUMN hostezee_room_id integer
      `);
    },
  },
  {
    name: "add_extra_services_property_id",
    async run() {
      if (!(await tableExists("extra_services"))) return;
      if (await columnExists("extra_services", "property_id")) return;
      await runRaw(`
        ALTER TABLE extra_services
          ADD COLUMN property_id integer REFERENCES properties(id) ON DELETE CASCADE
      `);
    },
  },
  {
    name: "add_extra_services_is_paid",
    async run() {
      if (!(await tableExists("extra_services"))) return;
      if (await columnExists("extra_services", "is_paid")) return;
      await runRaw(`
        ALTER TABLE extra_services
          ADD COLUMN is_paid boolean NOT NULL DEFAULT false
      `);
    },
  },
  {
    name: "add_extra_services_payment_method",
    async run() {
      if (!(await tableExists("extra_services"))) return;
      if (await columnExists("extra_services", "payment_method")) return;
      await runRaw(`
        ALTER TABLE extra_services
          ADD COLUMN payment_method varchar(50)
      `);
    },
  },
  {
    name: "add_extra_services_vendor_name",
    async run() {
      if (!(await tableExists("extra_services"))) return;
      if (await columnExists("extra_services", "vendor_name")) return;
      await runRaw(`ALTER TABLE extra_services ADD COLUMN vendor_name varchar(255)`);
    },
  },
  {
    name: "add_extra_services_vendor_contact",
    async run() {
      if (!(await tableExists("extra_services"))) return;
      if (await columnExists("extra_services", "vendor_contact")) return;
      await runRaw(`ALTER TABLE extra_services ADD COLUMN vendor_contact varchar(100)`);
    },
  },
  {
    name: "add_extra_services_commission",
    async run() {
      if (!(await tableExists("extra_services"))) return;
      if (await columnExists("extra_services", "commission")) return;
      await runRaw(`ALTER TABLE extra_services ADD COLUMN commission numeric(10,2)`);
    },
  },
];

async function reconcileRoomStatuses(): Promise<void> {
  const client = await pool.connect();
  try {
    const markOccupied = await client.query(`
      UPDATE rooms SET status = 'occupied'
      WHERE id IN (
        SELECT DISTINCT rid FROM (
          SELECT room_id AS rid FROM bookings
          WHERE status = 'checked-in' AND room_id IS NOT NULL
            AND check_in_date <= CURRENT_DATE AND check_out_date >= CURRENT_DATE
          UNION
          SELECT UNNEST(room_ids) AS rid FROM bookings
          WHERE status = 'checked-in' AND room_ids IS NOT NULL
            AND check_in_date <= CURRENT_DATE AND check_out_date >= CURRENT_DATE
        ) sub
      )
      AND status != 'occupied'
    `);

    const markAvailable = await client.query(`
      UPDATE rooms SET status = 'available'
      WHERE status = 'occupied'
      AND id NOT IN (
        SELECT DISTINCT rid FROM (
          SELECT room_id AS rid FROM bookings
          WHERE status = 'checked-in' AND room_id IS NOT NULL
            AND check_in_date <= CURRENT_DATE AND check_out_date >= CURRENT_DATE
          UNION
          SELECT UNNEST(room_ids) AS rid FROM bookings
          WHERE status = 'checked-in' AND room_ids IS NOT NULL
            AND check_in_date <= CURRENT_DATE AND check_out_date >= CURRENT_DATE
        ) sub
      )
    `);

    const fixed = (markOccupied.rowCount || 0) + (markAvailable.rowCount || 0);
    if (fixed > 0) {
      console.log(`[ROOM-SYNC] Reconciled ${markOccupied.rowCount} rooms → occupied, ${markAvailable.rowCount} rooms → available`);
    } else {
      console.log(`[ROOM-SYNC] All room statuses are in sync`);
    }
  } finally {
    client.release();
  }
}

export async function runStartupMigrations(): Promise<void> {
  console.log("[MIGRATIONS] Running startup migrations...");
  const results: MigrationResult[] = [];

  for (const migration of migrations) {
    try {
      await migration.run();
      results.push({ name: migration.name, applied: true, skipped: false });
      console.log(`[MIGRATIONS] ✅ ${migration.name}`);
    } catch (err: any) {
      results.push({ name: migration.name, applied: false, skipped: false, error: err.message });
      console.warn(`[MIGRATIONS] ⚠️  ${migration.name}: ${err.message}`);
    }
  }

  const applied = results.filter(r => r.applied).length;
  const errors = results.filter(r => r.error).length;
  console.log(`[MIGRATIONS] Done — ${applied} applied, ${errors} errors`);

  try {
    await reconcileRoomStatuses();
  } catch (err: any) {
    console.warn(`[ROOM-SYNC] Failed to reconcile room statuses: ${err.message}`);
  }
}
