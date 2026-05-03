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
    name: "add_booking_pending_alert_sent",
    run: async () => {
      if (!(await columnExists("bookings", "pending_alert_sent"))) {
        await runRaw(`ALTER TABLE bookings ADD COLUMN pending_alert_sent boolean DEFAULT false`);
      }
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
  {
    name: "add_aiosell_room_mappings_room_id",
    async run() {
      if (!(await tableExists("aiosell_room_mappings"))) return;
      if (await columnExists("aiosell_room_mappings", "aiosell_room_id")) return;
      await runRaw(`ALTER TABLE aiosell_room_mappings ADD COLUMN aiosell_room_id VARCHAR(100)`);
    },
  },
  {
    name: "add_lease_year_overrides_new_columns",
    async run() {
      if (!(await tableExists("lease_year_overrides"))) return;
      const client = await pool.connect();
      try {
        // Add remark column
        const hasRemark = await client.query(`
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'lease_year_overrides' AND column_name = 'remark'
        `);
        if (hasRemark.rows.length === 0) {
          await client.query(`ALTER TABLE lease_year_overrides ADD COLUMN remark text`);
        }

        // Add manual_paid_override column
        const hasManualPaid = await client.query(`
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'lease_year_overrides' AND column_name = 'manual_paid_override'
        `);
        if (hasManualPaid.rows.length === 0) {
          await client.query(`ALTER TABLE lease_year_overrides ADD COLUMN manual_paid_override numeric(10,2)`);
        }

        // Add manual_balance_override column
        const hasManualBalance = await client.query(`
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'lease_year_overrides' AND column_name = 'manual_balance_override'
        `);
        if (hasManualBalance.rows.length === 0) {
          await client.query(`ALTER TABLE lease_year_overrides ADD COLUMN manual_balance_override numeric(10,2)`);
        }

        // Add is_locked column
        const hasLocked = await client.query(`
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'lease_year_overrides' AND column_name = 'is_locked'
        `);
        if (hasLocked.rows.length === 0) {
          await client.query(`ALTER TABLE lease_year_overrides ADD COLUMN is_locked boolean NOT NULL DEFAULT false`);
        }
      } finally {
        client.release();
      }
    },
  },
  {
    name: "add_orders_payment_fields",
    async run() {
      if (!(await columnExists("orders", "payment_status"))) {
        await runRaw(`ALTER TABLE orders ADD COLUMN payment_status VARCHAR(20) DEFAULT 'unpaid'`);
      }
      if (!(await columnExists("orders", "payment_method"))) {
        await runRaw(`ALTER TABLE orders ADD COLUMN payment_method VARCHAR(20)`);
      }
    },
  },
  {
    name: "add_wallet_transactions_direction",
    async run() {
      if (!(await columnExists("wallet_transactions", "direction"))) {
        await runRaw(`ALTER TABLE wallet_transactions ADD COLUMN direction VARCHAR(10)`);
      }
    },
  },
  {
    name: "create_property_transfers",
    async run() {
      if (!(await tableExists("property_transfers"))) {
        await runRaw(`
          CREATE TABLE property_transfers (
            id SERIAL PRIMARY KEY,
            from_property_id INTEGER NOT NULL REFERENCES properties(id),
            to_property_id INTEGER NOT NULL REFERENCES properties(id),
            from_wallet_id INTEGER NOT NULL REFERENCES wallets(id),
            to_wallet_id INTEGER NOT NULL REFERENCES wallets(id),
            wallet_type VARCHAR(20) NOT NULL,
            amount DECIMAL(12,2) NOT NULL,
            reference_note TEXT,
            status VARCHAR(20) NOT NULL DEFAULT 'completed',
            reversed_by_id INTEGER,
            created_by VARCHAR REFERENCES users(id),
            created_at TIMESTAMP DEFAULT NOW()
          )
        `);
      }
    },
  },
  {
    name: "add_wallet_transactions_booking_sync_fields",
    async run() {
      if (!(await tableExists("wallet_transactions"))) return;
      const client = await pool.connect();
      try {
        await client.query(`
          ALTER TABLE wallet_transactions
            ADD COLUMN IF NOT EXISTS booking_id INTEGER,
            ADD COLUMN IF NOT EXISTS payment_type VARCHAR(20),
            ADD COLUMN IF NOT EXISTS is_reversal BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS reversal_of_id INTEGER
        `);
      } finally {
        client.release();
      }
    },
  },
  {
    name: "consolidate_wallets_to_cash_and_upi",
    async run() {
      if (!(await tableExists("wallets"))) return;
      const client = await pool.connect();
      try {
        // For properties that have both a 'bank' wallet AND a 'upi' wallet:
        // deactivate the 'bank' wallet (preserve history, just hide it)
        await client.query(`
          UPDATE wallets w
          SET is_active = false, name = CONCAT(name, ' (merged)')
          WHERE w.type = 'bank'
            AND w.is_active = true
            AND EXISTS (
              SELECT 1 FROM wallets upi
              WHERE upi.property_id = w.property_id
                AND upi.type = 'upi'
                AND upi.is_active = true
            )
        `);

        // For properties that have a 'bank' wallet but NO 'upi' wallet:
        // rename it to "Primary UPI" and change type to 'upi'
        await client.query(`
          UPDATE wallets w
          SET type = 'upi', name = 'Primary UPI', is_default = true
          WHERE w.type = 'bank'
            AND w.is_active = true
            AND NOT EXISTS (
              SELECT 1 FROM wallets upi
              WHERE upi.property_id = w.property_id
                AND upi.type = 'upi'
                AND upi.is_active = true
            )
        `);
      } finally {
        client.release();
      }
    },
  },
  {
    name: "disable_overdue_task_reminders",
    async run() {
      if (!(await tableExists("tasks"))) return;
      await runRaw(`
        UPDATE tasks
        SET reminder_enabled = false
        WHERE reminder_enabled = true
          AND status IN ('pending', 'in_progress')
          AND due_date IS NOT NULL
          AND due_date < NOW() - INTERVAL '7 days'
      `);
    },
  },
  {
    // Add performance indexes on the most-queried columns.
    // Each statement runs in its own exception block so a missing column on
    // one table never aborts the rest.  CREATE INDEX IF NOT EXISTS is
    // completely safe — it never modifies data.
    name: "add_performance_indexes",
    async run() {
      const indexes: Array<{ name: string; sql: string }> = [
        // Bookings: most-hit table
        { name: "idx_bookings_property_id",  sql: "CREATE INDEX IF NOT EXISTS idx_bookings_property_id   ON bookings (property_id)" },
        { name: "idx_bookings_status",        sql: "CREATE INDEX IF NOT EXISTS idx_bookings_status        ON bookings (status)" },
        { name: "idx_bookings_check_in",      sql: "CREATE INDEX IF NOT EXISTS idx_bookings_check_in      ON bookings (check_in_date)" },
        { name: "idx_bookings_check_out",     sql: "CREATE INDEX IF NOT EXISTS idx_bookings_check_out     ON bookings (check_out_date)" },
        { name: "idx_bookings_guest_id",      sql: "CREATE INDEX IF NOT EXISTS idx_bookings_guest_id      ON bookings (guest_id)" },
        { name: "idx_bookings_created_at",    sql: "CREATE INDEX IF NOT EXISTS idx_bookings_created_at    ON bookings (created_at DESC)" },
        // Rooms
        { name: "idx_rooms_property_id",      sql: "CREATE INDEX IF NOT EXISTS idx_rooms_property_id      ON rooms (property_id)" },
        { name: "idx_rooms_status",           sql: "CREATE INDEX IF NOT EXISTS idx_rooms_status           ON rooms (status)" },
        // Guests
        { name: "idx_guests_phone",           sql: "CREATE INDEX IF NOT EXISTS idx_guests_phone           ON guests (phone)" },
        { name: "idx_guests_email",           sql: "CREATE INDEX IF NOT EXISTS idx_guests_email           ON guests (email)" },
        // Bills — bills has no property_id; index only booking_id
        { name: "idx_bills_booking_id",       sql: "CREATE INDEX IF NOT EXISTS idx_bills_booking_id       ON bills (booking_id)" },
        // Orders
        { name: "idx_orders_booking_id",      sql: "CREATE INDEX IF NOT EXISTS idx_orders_booking_id      ON orders (booking_id)" },
        { name: "idx_orders_property_id",     sql: "CREATE INDEX IF NOT EXISTS idx_orders_property_id     ON orders (property_id)" },
        { name: "idx_orders_status",          sql: "CREATE INDEX IF NOT EXISTS idx_orders_status          ON orders (status)" },
        // Wallet transactions
        { name: "idx_wallet_txn_wallet_id",   sql: "CREATE INDEX IF NOT EXISTS idx_wallet_txn_wallet_id   ON wallet_transactions (wallet_id)" },
        { name: "idx_wallet_txn_created_at",  sql: "CREATE INDEX IF NOT EXISTS idx_wallet_txn_created_at  ON wallet_transactions (created_at DESC)" },
        // Staff / HR — these three indexes are critical for salary lookup batch queries
        // (getDetailedStaffSalaries uses IN-array filters on staff_member_id / staff_id)
        { name: "idx_salary_pay_staff_id",    sql: "CREATE INDEX IF NOT EXISTS idx_salary_pay_staff_id    ON salary_payments (staff_member_id)" },
        { name: "idx_salary_pay_date",        sql: "CREATE INDEX IF NOT EXISTS idx_salary_pay_date        ON salary_payments (payment_date)" },
        { name: "idx_salary_adv_staff_id",    sql: "CREATE INDEX IF NOT EXISTS idx_salary_adv_staff_id    ON salary_advances (staff_member_id)" },
        { name: "idx_salary_adv_date",        sql: "CREATE INDEX IF NOT EXISTS idx_salary_adv_date        ON salary_advances (advance_date)" },
        { name: "idx_attendance_staff_id",    sql: "CREATE INDEX IF NOT EXISTS idx_attendance_staff_id    ON attendance_records (staff_id)" },
        { name: "idx_attendance_date",        sql: "CREATE INDEX IF NOT EXISTS idx_attendance_date        ON attendance_records (attendance_date)" },
        { name: "idx_staff_members_prop_id",  sql: "CREATE INDEX IF NOT EXISTS idx_staff_members_prop_id  ON staff_members (property_id)" },
        // Expenses
        { name: "idx_expenses_property_id",   sql: "CREATE INDEX IF NOT EXISTS idx_expenses_property_id   ON property_expenses (property_id)" },
        { name: "idx_expenses_date",          sql: "CREATE INDEX IF NOT EXISTS idx_expenses_date          ON property_expenses (expense_date)" },
        // Activity logs
        { name: "idx_activity_logs_created",  sql: "CREATE INDEX IF NOT EXISTS idx_activity_logs_created  ON activity_logs (created_at DESC)" },
      ];

      const client = await pool.connect();
      try {
        for (const idx of indexes) {
          try {
            await client.query(idx.sql);
          } catch (_err) {
            // Column or table doesn't exist — skip this index silently
          }
        }
      } finally {
        client.release();
      }
    },
  },
  {
    // Composite indexes combining staff ID with date columns for salary history
    // range queries.  These allow the query planner to resolve both the staff
    // filter and the date range in a single index scan instead of two separate
    // lookups, which becomes increasingly important as the HR tables grow.
    name: "add_salary_history_composite_indexes",
    async run() {
      const indexes: Array<{ name: string; sql: string }> = [
        {
          name: "idx_attendance_staff_id_date",
          sql: "CREATE INDEX IF NOT EXISTS idx_attendance_staff_id_date ON attendance_records (staff_id, attendance_date)",
        },
        {
          name: "idx_salary_adv_staff_id_date",
          sql: "CREATE INDEX IF NOT EXISTS idx_salary_adv_staff_id_date ON salary_advances (staff_member_id, advance_date)",
        },
        {
          name: "idx_salary_pay_staff_id_date",
          sql: "CREATE INDEX IF NOT EXISTS idx_salary_pay_staff_id_date ON salary_payments (staff_member_id, payment_date)",
        },
      ];

      const client = await pool.connect();
      try {
        for (const idx of indexes) {
          try {
            await client.query(idx.sql);
          } catch (err: any) {
            console.warn(`[MIGRATIONS] add_salary_history_composite_indexes: skipped ${idx.name} — ${err.message}`);
          }
        }
      } finally {
        client.release();
      }
    },
  },
  {
    // Enable pg_trgm and add trigram GIN indexes on columns used in ILIKE booking
    // searches so that full-table sequential scans are replaced with fast index
    // lookups even with tens-of-thousands of rows.
    name: "add_booking_search_trigram_indexes",
    async run() {
      const client = await pool.connect();
      try {
        await client.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

        const indexes: Array<{ name: string; sql: string }> = [
          {
            name: "idx_guests_full_name_trgm",
            sql: "CREATE INDEX IF NOT EXISTS idx_guests_full_name_trgm ON guests USING GIN (full_name gin_trgm_ops)",
          },
          {
            name: "idx_guests_phone_trgm",
            sql: "CREATE INDEX IF NOT EXISTS idx_guests_phone_trgm ON guests USING GIN (phone gin_trgm_ops)",
          },
          {
            name: "idx_rooms_room_number_trgm",
            sql: "CREATE INDEX IF NOT EXISTS idx_rooms_room_number_trgm ON rooms USING GIN (room_number gin_trgm_ops)",
          },
          {
            name: "idx_properties_name_trgm",
            sql: "CREATE INDEX IF NOT EXISTS idx_properties_name_trgm ON properties USING GIN (name gin_trgm_ops)",
          },
        ];

        for (const idx of indexes) {
          try {
            await client.query(idx.sql);
          } catch (err: any) {
            console.warn(`[MIGRATIONS] add_booking_search_trigram_indexes: skipped ${idx.name} — ${err.message}`);
          }
        }
      } finally {
        client.release();
      }
    },
  },
  {
    name: "create_daily_report_settings",
    async run() {
      await runRaw(`
        CREATE TABLE IF NOT EXISTS daily_report_settings (
          id SERIAL PRIMARY KEY,
          is_enabled BOOLEAN NOT NULL DEFAULT false,
          phone_numbers TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
          property_ids INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
          template_id VARCHAR(50) DEFAULT '',
          last_sent_at TIMESTAMP,
          last_sent_status VARCHAR(20),
          last_sent_error TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      await runRaw(`
        INSERT INTO daily_report_settings (id, is_enabled, template_id)
        VALUES (1, false, '32163')
        ON CONFLICT (id) DO NOTHING
      `);
      // Back-fill template_id if row exists but template_id is empty
      await runRaw(`
        UPDATE daily_report_settings SET template_id = '32163'
        WHERE id = 1 AND (template_id IS NULL OR template_id = '')
      `);
    },
  },
  {
    name: "create_restaurant_popup",
    async run() {
      await runRaw(`
        CREATE TABLE IF NOT EXISTS restaurant_popup (
          id SERIAL PRIMARY KEY,
          property_id INTEGER NOT NULL UNIQUE,
          is_enabled BOOLEAN NOT NULL DEFAULT false,
          title VARCHAR(100) DEFAULT '',
          message TEXT DEFAULT '',
          show_order_button BOOLEAN NOT NULL DEFAULT false,
          order_button_text VARCHAR(50) DEFAULT 'Order Now',
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
    },
  },
  {
    name: "add_restaurant_popup_kitchen_timing",
    async run() {
      if (!(await columnExists("restaurant_popup", "opening_time"))) {
        await runRaw(`ALTER TABLE restaurant_popup ADD COLUMN opening_time VARCHAR(5) DEFAULT '08:00'`);
      }
      if (!(await columnExists("restaurant_popup", "closing_time"))) {
        await runRaw(`ALTER TABLE restaurant_popup ADD COLUMN closing_time VARCHAR(5) DEFAULT '22:00'`);
      }
      if (!(await columnExists("restaurant_popup", "pre_opening_message"))) {
        await runRaw(`ALTER TABLE restaurant_popup ADD COLUMN pre_opening_message TEXT DEFAULT 'Kitchen opens at {{OPEN_TIME}}. Please wait for {{WAIT_TIME}} minutes.'`);
      }
    },
  },
  {
    name: "add_guest_whatsapp_phone",
    async run() {
      if (!(await tableExists("guests"))) return;
      if (!(await columnExists("guests", "whatsapp_phone"))) {
        await runRaw(`ALTER TABLE guests ADD COLUMN whatsapp_phone VARCHAR(20)`);
      }
    },
  },
  {
    name: "create_salary_corrections",
    async run() {
      await runRaw(`
        CREATE TABLE IF NOT EXISTS salary_corrections (
          id SERIAL PRIMARY KEY,
          staff_member_id INTEGER NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
          property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
          month VARCHAR(7) NOT NULL,
          field VARCHAR(50) NOT NULL,
          corrected_value DECIMAL(12,2) NOT NULL,
          original_value DECIMAL(12,2),
          reason TEXT NOT NULL,
          corrected_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
          corrected_by_name VARCHAR(255),
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
    },
  },
  {
    name: "add_menu_display_order_columns",
    async run() {
      if (await tableExists("menu_categories") && !(await columnExists("menu_categories", "display_order"))) {
        await runRaw(`ALTER TABLE menu_categories ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0`);
      }
      if (await tableExists("menu_items") && !(await columnExists("menu_items", "display_order"))) {
        await runRaw(`ALTER TABLE menu_items ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0`);
      }
      if (await tableExists("menu_item_variants") && !(await columnExists("menu_item_variants", "display_order"))) {
        await runRaw(`ALTER TABLE menu_item_variants ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0`);
      }
      if (await tableExists("menu_item_add_ons") && !(await columnExists("menu_item_add_ons", "display_order"))) {
        await runRaw(`ALTER TABLE menu_item_add_ons ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0`);
      }
    },
  },
  {
    name: "backfill_dorm_bookings_beds_booked_from_stays",
    async run() {
      // Multi-bed dorm OTA reservations were historically inserted with
      // bookings.beds_booked = 1 even when the reservation actually covered
      // multiple beds (the extra beds lived in booking_room_stays only).
      // This caused the inventory-push and availability checks to under-count
      // booked beds. Backfill bookings.beds_booked = number of stays for the
      // primary dorm room. Only updates dorm bookings; only INCREASES the value
      // (never reduces it) so manual edits are preserved.
      if (!(await tableExists("bookings")) || !(await tableExists("booking_room_stays"))) return;
      if (!(await tableExists("rooms"))) return;
      const client = await pool.connect();
      try {
        const result = await client.query(`
          UPDATE bookings b
          SET beds_booked = sub.stay_count, updated_at = NOW()
          FROM (
            SELECT brs.booking_id, brs.room_id, COUNT(*)::int AS stay_count
            FROM booking_room_stays brs
            WHERE brs.room_id IS NOT NULL
            GROUP BY brs.booking_id, brs.room_id
          ) sub
          JOIN rooms r ON r.id = sub.room_id
          WHERE b.id = sub.booking_id
            AND b.room_id = sub.room_id
            AND r.room_category = 'dormitory'
            AND sub.stay_count > COALESCE(b.beds_booked, 1)
            AND b.status NOT IN ('cancelled','checked-out','no_show')
        `);
        if (result.rowCount && result.rowCount > 0) {
          console.log(`[MIGRATIONS] backfill_dorm_bookings_beds_booked_from_stays: updated ${result.rowCount} dorm booking(s)`);
        }
      } finally {
        client.release();
      }
    },
  },
  {
    // Test Order Mode — adds is_test flag to orders so test orders can be
    // excluded from all financial reports/wallets. Idempotent.
    name: "add_orders_is_test_flag",
    async run() {
      await runRaw(`
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT FALSE;
        CREATE INDEX IF NOT EXISTS idx_orders_is_test ON orders(is_test);
      `);
    },
  },
  {
    // Cafe Mode — properties.property_type ('hotel' | 'cafe'). Drives the
    // slimmed café sidebar. Idempotent.
    name: "add_properties_property_type",
    async run() {
      await runRaw(`
        ALTER TABLE properties
          ADD COLUMN IF NOT EXISTS property_type VARCHAR(20) NOT NULL DEFAULT 'hotel';
      `);
    },
  },
  {
    // Takeaway / Parcel orders — orders.order_mode ('dine-in' | 'takeaway' | 'room').
    // Idempotent.
    name: "add_orders_order_mode",
    async run() {
      await runRaw(`
        ALTER TABLE orders
          ADD COLUMN IF NOT EXISTS order_mode VARCHAR(20) DEFAULT 'dine-in';
      `);
    },
  },
  {
    // Dine-in QR feature — orders.table_number ('T1', 'A5', etc.) for
    // restaurant orders placed via a table QR. Idempotent.
    name: "add_orders_table_number",
    async run() {
      await runRaw(`
        ALTER TABLE orders
          ADD COLUMN IF NOT EXISTS table_number VARCHAR(50);
      `);
    },
  },
  {
    // Restaurant Tables — physical table list per property (used by QR
    // dine-in flow + table reservations). Idempotent.
    name: "create_restaurant_tables",
    async run() {
      await runRaw(`
        CREATE TABLE IF NOT EXISTS restaurant_tables (
          id SERIAL PRIMARY KEY,
          property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
          name VARCHAR(50) NOT NULL,
          capacity INTEGER DEFAULT 4,
          location VARCHAR(100),
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
    },
  },
  {
    // Table Reservations — advance bookings for a restaurant/cafe table.
    // Idempotent.
    name: "create_table_reservations",
    async run() {
      await runRaw(`
        CREATE TABLE IF NOT EXISTS table_reservations (
          id SERIAL PRIMARY KEY,
          property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
          table_id INTEGER REFERENCES restaurant_tables(id) ON DELETE SET NULL,
          guest_name VARCHAR(255) NOT NULL,
          phone VARCHAR(20),
          party_size INTEGER NOT NULL DEFAULT 2,
          reservation_at TIMESTAMP NOT NULL,
          duration_minutes INTEGER NOT NULL DEFAULT 90,
          status VARCHAR(20) NOT NULL DEFAULT 'booked',
          notes TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_table_reservations_property_at
          ON table_reservations(property_id, reservation_at);
      `);
    },
  },
  {
    // Second-level kitchen-acceptance escalation. Adds a one-shot stamp on
    // orders + per-property timeout setting + partial index for the cron's
    // per-tick scan. Idempotent.
    name: "add_kitchen_acceptance_escalation",
    async run() {
      await runRaw(`
        ALTER TABLE orders
          ADD COLUMN IF NOT EXISTS acceptance_alert_sent_at TIMESTAMP;
        ALTER TABLE feature_settings
          ADD COLUMN IF NOT EXISTS kitchen_acceptance_timeout_minutes INTEGER NOT NULL DEFAULT 10;
        CREATE INDEX IF NOT EXISTS idx_orders_pending_escalation
          ON orders(property_id, status, created_at)
          WHERE status = 'pending' AND acceptance_alert_sent_at IS NULL AND is_test = false;
      `);
    },
  },
  {
    // Dynamic pricing add-on — creates 3 tables. Idempotent (IF NOT EXISTS).
    // Does NOT touch any existing booking/inventory/OTA tables.
    name: "create_dynamic_pricing_tables",
    async run() {
      await runRaw(`
        CREATE TABLE IF NOT EXISTS pricing_config (
          id SERIAL PRIMARY KEY,
          property_id INTEGER NOT NULL UNIQUE REFERENCES properties(id) ON DELETE CASCADE,
          auto_pricing_enabled BOOLEAN NOT NULL DEFAULT FALSE,
          emergency_stop BOOLEAN NOT NULL DEFAULT FALSE,
          occupancy_enabled BOOLEAN NOT NULL DEFAULT TRUE,
          demand_enabled BOOLEAN NOT NULL DEFAULT TRUE,
          day_enabled BOOLEAN NOT NULL DEFAULT TRUE,
          festival_enabled BOOLEAN NOT NULL DEFAULT TRUE,
          ota_push_enabled BOOLEAN NOT NULL DEFAULT FALSE,
          direct_booking_enabled BOOLEAN NOT NULL DEFAULT FALSE,
          enforce_min_max BOOLEAN NOT NULL DEFAULT TRUE,
          threshold_enabled BOOLEAN NOT NULL DEFAULT TRUE,
          threshold_percent DECIMAL(5,2) NOT NULL DEFAULT 5.00,
          update_frequency_minutes INTEGER NOT NULL DEFAULT 30,
          preset VARCHAR(20) NOT NULL DEFAULT 'balanced',
          festival_dates JSONB NOT NULL DEFAULT '[]'::jsonb,
          last_run_at TIMESTAMP,
          last_change_at TIMESTAMP,
          last_change_reason TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS room_pricing_settings (
          id SERIAL PRIMARY KEY,
          room_id INTEGER NOT NULL UNIQUE REFERENCES rooms(id) ON DELETE CASCADE,
          property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
          min_price DECIMAL(10,2),
          max_price DECIMAL(10,2),
          manual_override BOOLEAN NOT NULL DEFAULT FALSE,
          manual_price DECIMAL(10,2),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS pricing_history (
          id SERIAL PRIMARY KEY,
          property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
          room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
          for_date DATE NOT NULL,
          base_price DECIMAL(10,2) NOT NULL,
          old_price DECIMAL(10,2),
          new_price DECIMAL(10,2) NOT NULL,
          occupancy_factor DECIMAL(5,3),
          demand_factor DECIMAL(5,3),
          day_factor DECIMAL(5,3),
          festival_factor DECIMAL(5,3),
          reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
          source VARCHAR(20) NOT NULL DEFAULT 'auto',
          ota_pushed BOOLEAN NOT NULL DEFAULT FALSE,
          ota_push_error TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_pricing_history_property_date
          ON pricing_history(property_id, for_date DESC, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_pricing_history_room_date
          ON pricing_history(room_id, for_date);
      `);
      console.log("[MIGRATIONS] Dynamic pricing tables ready");
    },
  },
];

async function reconcileRoomStatuses(): Promise<void> {
  const client = await pool.connect();
  try {
    // ── Regular (non-dormitory) rooms ───────────────────────────────────────
    // A room is occupied when ANY checked-in guest is using it today.
    const markOccupied = await client.query(`
      UPDATE rooms SET status = 'occupied'
      WHERE room_category != 'dormitory'
      AND id IN (
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
      WHERE room_category != 'dormitory'
      AND status = 'occupied'
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

    // ── Dormitory rooms ─────────────────────────────────────────────────────
    // A dorm room is only fully "occupied" when checked-in beds ≥ total_beds.
    // Otherwise keep it "available" so new bed bookings can still be assigned.
    const markDormOccupied = await client.query(`
      UPDATE rooms SET status = 'occupied'
      WHERE room_category = 'dormitory'
      AND status != 'occupied'
      AND (
        SELECT COALESCE(SUM(COALESCE(b.beds_booked, 1)), 0)
        FROM bookings b
        WHERE b.room_id = rooms.id
          AND b.status = 'checked-in'
          AND b.check_in_date <= CURRENT_DATE AND b.check_out_date >= CURRENT_DATE
      ) >= COALESCE(rooms.total_beds, 6)
    `);

    const markDormAvailable = await client.query(`
      UPDATE rooms SET status = 'available'
      WHERE room_category = 'dormitory'
      AND status = 'occupied'
      AND (
        SELECT COALESCE(SUM(COALESCE(b.beds_booked, 1)), 0)
        FROM bookings b
        WHERE b.room_id = rooms.id
          AND b.status = 'checked-in'
          AND b.check_in_date <= CURRENT_DATE AND b.check_out_date >= CURRENT_DATE
      ) < COALESCE(rooms.total_beds, 6)
    `);

    const fixed = (markOccupied.rowCount || 0) + (markAvailable.rowCount || 0)
                + (markDormOccupied.rowCount || 0) + (markDormAvailable.rowCount || 0);
    if (fixed > 0) {
      console.log(`[ROOM-SYNC] Reconciled ${markOccupied.rowCount} rooms → occupied, ${markAvailable.rowCount} rooms → available, ${markDormOccupied.rowCount} dorms → occupied, ${markDormAvailable.rowCount} dorms → available`);
    } else {
      console.log(`[ROOM-SYNC] All room statuses are in sync`);
    }
  } finally {
    client.release();
  }
}

async function migrateMessageTemplatesPropertyId(): Promise<void> {
  if (!(await columnExists("message_templates", "property_id"))) {
    await runRaw(`ALTER TABLE message_templates ADD COLUMN property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE`);
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

  try {
    await seedWhatsappAlertConfigs();
  } catch (err: any) {
    console.warn(`[WA-SEED] Failed to seed WhatsApp alert configs: ${err.message}`);
  }

  try {
    await migrateMessageTemplatesPropertyId();
  } catch (err: any) {
    console.warn(`[MIGRATE] message_templates property_id: ${err.message}`);
  }
}

// Add new staff-alert templates here. They will be auto-inserted on next
// server start (ON CONFLICT DO NOTHING keeps existing enable/disable state).
const DEFAULT_WA_ALERT_CONFIGS: Array<{
  template_key: string;
  template_name: string;
  template_wid: string;
  description: string;
}> = [
  {
    template_key: "ota_booking_alert",
    template_name: "OTA Booking Alert",
    template_wid: "28770",
    description: "Sends a WhatsApp alert to staff when a new OTA booking (Booking.com / MMT) arrives",
  },
  {
    template_key: "food_order_staff_alert",
    template_name: "New Food Order Alert",
    template_wid: "33130",
    description: "Sends an alert to staff when a customer places a food order via QR menu",
  },
];

async function seedWhatsappAlertConfigs(): Promise<void> {
  const client = await pool.connect();
  try {
    for (const cfg of DEFAULT_WA_ALERT_CONFIGS) {
      await client.query(
        `INSERT INTO whatsapp_alert_configs (template_key, template_name, template_wid, description, is_globally_enabled)
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT (template_key) DO UPDATE SET template_wid = EXCLUDED.template_wid, template_name = EXCLUDED.template_name, description = EXCLUDED.description`,
        [cfg.template_key, cfg.template_name, cfg.template_wid, cfg.description]
      );
    }
    console.log(`[WA-SEED] WhatsApp alert configs seeded (${DEFAULT_WA_ALERT_CONFIGS.length} templates)`);
  } finally {
    client.release();
  }
}
