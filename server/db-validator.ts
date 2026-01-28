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

    // Check data types for bills (should be integer, not numeric/decimal)
    const billsTypeCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'bills' 
        AND column_name IN ('subtotal', 'total_amount', 'balance_amount')
    `);
    
    for (const row of billsTypeCheck.rows) {
      if (row.data_type === 'numeric' || row.data_type === 'decimal') {
        errors.push(`bills.${row.column_name} should be INTEGER, but is ${row.data_type}`);
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
