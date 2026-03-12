// Database schema validator - runs at startup to detect schema drift
import { pool } from "./db";

export async function validateDatabaseSchema(): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];
  
  try {
    // Non-critical tables: ensure they exist so background features don't spam logs
    // (e.g. audit logs are optional and should never break core APIs)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        entity_type VARCHAR(50) NOT NULL,
        entity_id VARCHAR(255) NOT NULL,
        action VARCHAR(50) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        user_role VARCHAR(50),
        property_context VARCHAR(255)[],
        change_set JSONB,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // AioSell integration tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS aiosell_configurations (
        id SERIAL PRIMARY KEY,
        property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        hotel_code VARCHAR(255) NOT NULL,
        pms_name VARCHAR(255) NOT NULL,
        pms_password VARCHAR(500),
        api_base_url VARCHAR(500) NOT NULL DEFAULT 'https://live.aiosell.com',
        is_active BOOLEAN DEFAULT false,
        is_sandbox BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS aiosell_room_mappings (
        id SERIAL PRIMARY KEY,
        config_id INTEGER NOT NULL DEFAULT 0,
        property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        hostezee_room_id INTEGER NOT NULL,
        hostezee_room_type VARCHAR(100) NOT NULL DEFAULT '',
        aiosell_room_code VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS aiosell_rate_plans (
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

    await pool.query(`
      CREATE TABLE IF NOT EXISTS aiosell_sync_logs (
        id SERIAL PRIMARY KEY,
        config_id INTEGER NOT NULL DEFAULT 0,
        property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        sync_type VARCHAR(50) NOT NULL,
        direction VARCHAR(20) NOT NULL DEFAULT 'outbound',
        status VARCHAR(50) NOT NULL,
        request_payload JSONB,
        response_payload JSONB,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS aiosell_rate_updates (
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

    await pool.query(`
      CREATE TABLE IF NOT EXISTS aiosell_inventory_restrictions (
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

    // Check critical columns exist
    const criticalChecks = [
      {
        table: 'orders',
        columns: ['id', 'order_type', 'booking_id'],
        description: 'orders table columns'
      },
      {
        table: 'bills',
        columns: ['id', 'subtotal', 'total_amount', 'balance_amount'],
        description: 'bills table columns'
      },
      {
        table: 'bookings',
        columns: ['id', 'check_out_date'],
        description: 'bookings table columns'
      },
      {
        table: 'message_templates',
        columns: ['id', 'template_type'],
        description: 'message_templates table columns'
      },
    ];

    for (const check of criticalChecks) {
      const result = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1
      `, [check.table]);
      
      const existingColumns = result.rows.map((r: any) => r.column_name);
      const missingColumns = check.columns.filter(col => !existingColumns.includes(col));
      
      if (missingColumns.length > 0) {
        errors.push(`Missing columns in ${check.table}: ${missingColumns.join(', ')}`);
      }
    }

    // Check data types for bills (numeric/decimal is correct for monetary values)
    const billsTypeCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'bills' 
        AND column_name IN ('subtotal', 'total_amount', 'balance_amount')
    `);
    
    for (const row of billsTypeCheck.rows) {
      // Accept numeric, decimal, or integer for monetary columns
      const validTypes = ['numeric', 'decimal', 'integer', 'bigint'];
      if (!validTypes.includes(row.data_type)) {
        errors.push(`bills.${row.column_name} has unexpected type: ${row.data_type}`);
      }
    }

    // Check bookings.check_out_date is DATE, not TIMESTAMP
    const bookingsDateCheck = await pool.query(`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'bookings' 
        AND column_name = 'check_out_date'
    `);
    
    if (bookingsDateCheck.rows.length > 0) {
      const dataType = bookingsDateCheck.rows[0].data_type;
      if (dataType === 'timestamp without time zone' || dataType === 'timestamp with time zone') {
        errors.push(`bookings.check_out_date should be DATE, but is ${dataType}`);
      }
    }

    if (errors.length > 0) {
      console.error('[DB VALIDATOR] Schema drift detected:');
      errors.forEach(err => console.error(`  ❌ ${err}`));
      return { valid: false, errors };
    }

    console.log('[DB VALIDATOR] ✅ Schema validation passed');
    return { valid: true, errors: [] };
  } catch (error: any) {
    console.error('[DB VALIDATOR] Error validating schema:', error.message);
    return { valid: false, errors: [`Validation error: ${error.message}`] };
  }
}
