import { db } from '../server/db';
import * as schema from '../shared/schema';
import fs from 'fs';
import path from 'path';

async function backupDatabase() {
  console.log('🔄 Starting database backup...\n');
  
  try {
    const backup: any = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      data: {}
    };

    // Export all tables
    console.log('📦 Exporting tables...');
    
    const tables = [
      { name: 'users', query: db.select().from(schema.users) },
      { name: 'properties', query: db.select().from(schema.properties) },
      { name: 'rooms', query: db.select().from(schema.rooms) },
      { name: 'guests', query: db.select().from(schema.guests) },
      { name: 'travelAgents', query: db.select().from(schema.travelAgents) },
      { name: 'bookings', query: db.select().from(schema.bookings) },
      { name: 'enquiries', query: db.select().from(schema.enquiries) },
      { name: 'bills', query: db.select().from(schema.bills) },
      { name: 'menuItems', query: db.select().from(schema.menuItems) },
      { name: 'orders', query: db.select().from(schema.orders) },
      { name: 'extraServices', query: db.select().from(schema.extraServices) },
      { name: 'messageTemplates', query: db.select().from(schema.messageTemplates) },
      { name: 'communications', query: db.select().from(schema.communications) },
      { name: 'propertyLeases', query: db.select().from(schema.propertyLeases) },
      { name: 'leasePayments', query: db.select().from(schema.leasePayments) },
      { name: 'expenseCategories', query: db.select().from(schema.expenseCategories) },
      { name: 'propertyExpenses', query: db.select().from(schema.propertyExpenses) },
      { name: 'bankTransactions', query: db.select().from(schema.bankTransactions) },
      { name: 'auditLog', query: db.select().from(schema.auditLog) },
      { name: 'staffSalaries', query: db.select().from(schema.staffSalaries) },
      { name: 'salaryAdvances', query: db.select().from(schema.salaryAdvances) },
      { name: 'salaryPayments', query: db.select().from(schema.salaryPayments) },
    ];

    for (const table of tables) {
      try {
        const data = await table.query;
        backup.data[table.name] = data;
        console.log(`  ✅ ${table.name}: ${data.length} records`);
      } catch (error: any) {
        console.log(`  ⚠️  ${table.name}: Failed (${error.message})`);
        backup.data[table.name] = [];
      }
    }

    // Create backups directory if it doesn't exist
    const backupsDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir);
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `database-backup-${timestamp}.json`;
    const filepath = path.join(backupsDir, filename);

    // Write backup file
    fs.writeFileSync(filepath, JSON.stringify(backup, null, 2));

    console.log('\n✅ Database backup completed successfully!');
    console.log(`📁 File saved: ${filepath}`);
    console.log(`📊 Total records exported: ${Object.values(backup.data).reduce((sum: number, arr: any) => sum + arr.length, 0)}`);
    
    // Also create a latest.json symlink/copy for convenience
    const latestPath = path.join(backupsDir, 'latest.json');
    fs.writeFileSync(latestPath, JSON.stringify(backup, null, 2));
    console.log(`📁 Latest backup: ${latestPath}`);
    
    console.log('\n💡 To download: Right-click the file in the Files panel and select "Download"');
    
  } catch (error: any) {
    console.error('❌ Backup failed:', error.message);
    process.exit(1);
  }
}

backupDatabase();
