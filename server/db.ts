// Load env: production → .env.production, else .env.local (for local testing)
if (!process.env.DATABASE_URL) {
  try {
    const { config } = await import('dotenv');
    if (process.env.NODE_ENV === 'production') {
      config({ path: '.env.production' });
    } else {
      config({ path: '.env.local' });
    }
  } catch (e) {
    // env file might not exist
  }
}

import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Use regular PostgreSQL driver (pg) for local development and VPS
// Only use Neon serverless driver if explicitly using Neon database
// Check if it's a Neon database (contains 'neon.tech' in connection string)
const isNeonDatabase = process.env.DATABASE_URL.includes('neon.tech');

// Dynamic imports for conditional database driver
// Use Neon serverless ONLY for Neon cloud databases
// Use regular pg driver for: local PostgreSQL, VPS PostgreSQL, or any other PostgreSQL
const useNeonDriver = isNeonDatabase;

const dbModule = useNeonDriver
  ? await import('drizzle-orm/neon-serverless')
  : await import('drizzle-orm/node-postgres');

let pool: any;
let db: any;

if (useNeonDriver) {
  // Neon serverless driver (only if using Neon cloud database)
  const poolModule = await import('@neondatabase/serverless');
  const { Pool: NeonPool, neonConfig } = poolModule;
  const ws = await import("ws");
  
  neonConfig.webSocketConstructor = ws.default;
  pool = new NeonPool({ connectionString: process.env.DATABASE_URL });
  db = dbModule.drizzle({ client: pool, schema });
  console.log('[DB INIT] Using Neon serverless driver');
} else {
  // Regular PostgreSQL using node-postgres (for local development and VPS)
  const poolModule = await import('pg');
  // Handle both default export and named export
  const Pool = poolModule.default?.Pool || poolModule.Pool || (poolModule as any).default;
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = dbModule.drizzle({ client: pool, schema });
  console.log('[DB INIT] Using node-postgres driver (local/VPS PostgreSQL)');
}

export { pool, db };

// Debug logging
console.log('[DB INIT] Using DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 30) + '...');
