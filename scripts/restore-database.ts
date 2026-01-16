import { db } from '../server/db';
import * as schema from '../shared/schema';
import fs from 'fs';
import path from 'path';

async function restoreDatabase(backupFile: string) {
  console.log('🔄 Starting database restore...\n');
  
  try {
    // Read backup file
    const filepath = path.resolve(backupFile);
    if (!fs.existsSync(filepath)) {
      throw new Error(`Backup file not found: ${filepath}`);
    }

    const backupData = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    console.log(`📁 Reading backup from: ${backupFile}`);
    console.log(`📅 Backup date: ${backupData.exportDate}`);
    console.log(`📊 Version: ${backupData.version}\n`);

    // Restore tables in order (respecting foreign key dependencies)
    const restoreOrder = [
      { name: 'users', table: schema.users },
      { name: 'properties', table: schema.properties },
      { name: 'expenseCategories', table: schema.expenseCategories },
      { name: 'rooms', table: schema.rooms },
      { name: 'guests', table: schema.guests },
      { name: 'travelAgents', table: schema.travelAgents },
      { name: 'bookings', table: schema.bookings },
      { name: 'enquiries', table: schema.enquiries },
      { name: 'bills', table: schema.bills },
      { name: 'menuItems', table: schema.menuItems },
      { name: 'orders', table: schema.orders },
      { name: 'extraServices', table: schema.extraServices },
      { name: 'messageTemplates', table: schema.messageTemplates },
      { name: 'communications', table: schema.communications },
      { name: 'propertyLeases', table: schema.propertyLeases },
      { name: 'leasePayments', table: schema.leasePayments },
      { name: 'propertyExpenses', table: schema.propertyExpenses },
      { name: 'bankTransactions', table: schema.bankTransactions },
      { name: 'staffSalaries', table: schema.staffSalaries },
      { name: 'salaryAdvances', table: schema.salaryAdvances },
      { name: 'salaryPayments', table: schema.salaryPayments },
      { name: 'auditLog', table: schema.auditLog },
    ];

    console.log('⚠️  WARNING: This will DELETE all existing data!');
    console.log('Press Ctrl+C within 5 seconds to cancel...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));

    for (const { name, table } of restoreOrder) {
      try {
        const records = backupData.data[name] || [];
        if (records.length === 0) {
          console.log(`  ⏭️  ${name}: No data to restore`);
          continue;
        }

        // Delete existing data
        await db.delete(table);
        
        // Insert backup data
        await db.insert(table).values(records);
        
        console.log(`  ✅ ${name}: Restored ${records.length} records`);
      } catch (error: any) {
        console.log(`  ❌ ${name}: Failed (${error.message})`);
      }
    }

    console.log('\n✅ Database restore completed!');
    console.log('🔄 Please restart your application to see the restored data.');
    
  } catch (error: any) {
    console.error('❌ Restore failed:', error.message);
    process.exit(1);
  }
}

// Get backup file from command line argument
const backupFile = process.argv[2] || 'backups/latest.json';
restoreDatabase(backupFile);
