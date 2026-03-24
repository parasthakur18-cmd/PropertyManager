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
    // aiosell_room_mappings was created without config_id and hostezee_room_type
    name: "fix_aiosell_room_mappings_schema",
    async run() {
      if (!(await tableExists("aiosell_room_mappings"))) return;
      if (!(await columnExists("aiosell_room_mappings", "config_id"))) {
        await runRaw(`ALTER TABLE aiosell_room_mappings ADD COLUMN config_id INTEGER NOT NULL DEFAULT 0`);
      }
      if (!(await columnExists("aiosell_room_mappings", "hostezee_room_type"))) {
        await runRaw(`ALTER TABLE aiosell_room_mappings ADD COLUMN hostezee_room_type VARCHAR(100) NOT NULL DEFAULT ''`);
      }
    },
  },
  {
    // aiosell_rate_updates was created with a completely different schema:
    // old: room_id, aiosell_room_code, check_in_date, check_out_date, availability
    // new: config_id, room_mapping_id, rate_plan_id, start_date, end_date, is_pushed, pushed_at
    name: "fix_aiosell_rate_updates_schema",
    async run() {
      if (!(await tableExists("aiosell_rate_updates"))) return;
      const hasNewSchema = await columnExists("aiosell_rate_updates", "config_id");
      if (hasNewSchema) return;
      await runRaw(`
        DROP TABLE IF EXISTS aiosell_rate_updates CASCADE;
        CREATE TABLE aiosell_rate_updates (
          id SERIAL PRIMARY KEY,
          config_id INTEGER NOT NULL,
          property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
          room_mapping_id INTEGER NOT NULL,
          rate_plan_id INTEGER NOT NULL,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          rate DECIMAL(10,2) NOT NULL,
          is_pushed BOOLEAN NOT NULL DEFAULT false,
          pushed_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
    },
  },
  {
    // aiosell_sync_logs was created without config_id, direction, request_payload, response_payload
    name: "fix_aiosell_sync_logs_schema",
    async run() {
      if (!(await tableExists("aiosell_sync_logs"))) return;
      if (!(await columnExists("aiosell_sync_logs", "config_id"))) {
        await runRaw(`ALTER TABLE aiosell_sync_logs ADD COLUMN config_id INTEGER NOT NULL DEFAULT 0`);
      }
      if (!(await columnExists("aiosell_sync_logs", "direction"))) {
        await runRaw(`ALTER TABLE aiosell_sync_logs ADD COLUMN direction VARCHAR(20) NOT NULL DEFAULT 'outbound'`);
      }
      if (!(await columnExists("aiosell_sync_logs", "request_payload"))) {
        await runRaw(`ALTER TABLE aiosell_sync_logs ADD COLUMN request_payload JSONB`);
      }
      if (!(await columnExists("aiosell_sync_logs", "response_payload"))) {
        await runRaw(`ALTER TABLE aiosell_sync_logs ADD COLUMN response_payload JSONB`);
      }
    },
  },
  {
    // aiosell_inventory_restrictions was created with old schema
    // old: room_id, aiosell_room_code, check_in_date, check_out_date, min_stay, max_stay, closed_to_arrival, closed_to_departure
    // new: config_id, room_mapping_id, start_date, end_date, stop_sell, minimum_stay, close_on_arrival, close_on_departure, is_pushed
    name: "fix_aiosell_inventory_restrictions_schema",
    async run() {
      if (!(await tableExists("aiosell_inventory_restrictions"))) return;
      const hasNewSchema = await columnExists("aiosell_inventory_restrictions", "config_id");
      if (hasNewSchema) return;
      await runRaw(`
        DROP TABLE IF EXISTS aiosell_inventory_restrictions CASCADE;
        CREATE TABLE aiosell_inventory_restrictions (
          id SERIAL PRIMARY KEY,
          config_id INTEGER NOT NULL,
          property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
          room_mapping_id INTEGER NOT NULL,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          stop_sell BOOLEAN NOT NULL DEFAULT false,
          minimum_stay INTEGER DEFAULT 1,
          close_on_arrival BOOLEAN NOT NULL DEFAULT false,
          close_on_departure BOOLEAN NOT NULL DEFAULT false,
          is_pushed BOOLEAN NOT NULL DEFAULT false,
          pushed_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
    },
  },
  {
    name: "add_bookings_no_show_fields",
    async run() {
      if (!(await tableExists("bookings"))) return;
      if (!(await columnExists("bookings", "no_show_date"))) {
        await runRaw(`ALTER TABLE bookings ADD COLUMN no_show_date TIMESTAMP`);
      }
      if (!(await columnExists("bookings", "no_show_charges"))) {
        await runRaw(`ALTER TABLE bookings ADD COLUMN no_show_charges DECIMAL(10,2) DEFAULT 0`);
      }
      if (!(await columnExists("bookings", "no_show_notes"))) {
        await runRaw(`ALTER TABLE bookings ADD COLUMN no_show_notes TEXT`);
      }
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
  {
    name: "add_staff_exit_fields",
    async run() {
      if (!(await tableExists("staff_members"))) return;
      if (!(await columnExists("staff_members", "exit_type"))) {
        await runRaw(`ALTER TABLE staff_members ADD COLUMN exit_type varchar(20)`);
      }
      if (!(await columnExists("staff_members", "exit_reason"))) {
        await runRaw(`ALTER TABLE staff_members ADD COLUMN exit_reason text`);
      }
    },
  },
  {
    name: "add_property_disable_fields",
    async run() {
      if (!(await tableExists("properties"))) return;
      if (!(await columnExists("properties", "disable_type"))) {
        await runRaw(`ALTER TABLE properties ADD COLUMN disable_type varchar(50)`);
      }
      if (!(await columnExists("properties", "disable_reason"))) {
        await runRaw(`ALTER TABLE properties ADD COLUMN disable_reason text`);
      }
      if (!(await columnExists("properties", "closed_at"))) {
        await runRaw(`ALTER TABLE properties ADD COLUMN closed_at timestamptz`);
      }
    },
  },
  {
    name: "add_booking_advance_payment_method",
    async run() {
      if (!(await tableExists("bookings"))) return;
      if (!(await columnExists("bookings", "advance_payment_method"))) {
        await runRaw(`ALTER TABLE bookings ADD COLUMN advance_payment_method varchar(20) DEFAULT 'cash'`);
      }
    },
  },
  {
    name: "add_vendor_id_to_property_expenses",
    async run() {
      if (!(await tableExists("property_expenses"))) return;
      if (!(await columnExists("property_expenses", "vendor_id"))) {
        await runRaw(`ALTER TABLE property_expenses ADD COLUMN vendor_id integer REFERENCES vendors(id) ON DELETE SET NULL`);
      }
    },
  },
  {
    name: "add_vendor_transaction_due_date",
    async run() {
      if (!(await tableExists("vendor_transactions"))) return;
      if (!(await columnExists("vendor_transactions", "due_date"))) {
        await runRaw(`ALTER TABLE vendor_transactions ADD COLUMN due_date timestamp`);
      }
      if (!(await columnExists("vendor_transactions", "due_reminder_sent"))) {
        await runRaw(`ALTER TABLE vendor_transactions ADD COLUMN due_reminder_sent boolean DEFAULT false`);
      }
    },
  },
  {
    name: "add_vendor_reminder_settings",
    async run() {
      if (!(await tableExists("feature_settings"))) return;
      if (!(await columnExists("feature_settings", "vendor_reminder_enabled"))) {
        await runRaw(`ALTER TABLE feature_settings ADD COLUMN vendor_reminder_enabled boolean DEFAULT true`);
      }
      if (!(await columnExists("feature_settings", "vendor_reminder_days_before"))) {
        await runRaw(`ALTER TABLE feature_settings ADD COLUMN vendor_reminder_days_before integer DEFAULT 2`);
      }
    },
  },
  {
    name: "add_booking_room_stays",
    async run() {
      await runRaw(`
        CREATE TABLE IF NOT EXISTS booking_room_stays (
          id SERIAL PRIMARY KEY,
          booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
          room_id INTEGER REFERENCES rooms(id),
          aiosell_room_code VARCHAR(50),
          room_type VARCHAR(100),
          meal_plan VARCHAR(50),
          status VARCHAR(20) NOT NULL DEFAULT 'tbs',
          amount DECIMAL(10, 2),
          adults INTEGER DEFAULT 1,
          children INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
    },
  },
  {
    name: "fix_aiosell_config_property_mapping_woodpecker_jibhi",
    async run() {
      if (!(await tableExists("aiosell_configurations"))) return;
      if (!(await tableExists("properties"))) return;
      // Fix: hotel_code 15253615 (The Woodpecker Inn Jibhi) was incorrectly linked
      // to "Woodpecker Inn & Cafe - 2". Re-link it to the correct property by name.
      await runRaw(`
        UPDATE aiosell_configurations
        SET property_id = (
          SELECT id FROM properties
          WHERE name ILIKE '%Woodpecker%Jibhi%'
             OR name ILIKE '%Woodpecker Inn Jibhi%'
          ORDER BY id
          LIMIT 1
        )
        WHERE hotel_code = '15253615'
          AND property_id = (
            SELECT id FROM properties
            WHERE name ILIKE '%Woodpecker%2%'
               OR name ILIKE '%Woodpecker%Cafe%2%'
            ORDER BY id
            LIMIT 1
          )
      `);
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
