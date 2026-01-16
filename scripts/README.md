# Database Backup & Restore Scripts

These scripts allow you to backup and restore your complete Hostezee database.

## 📦 Backup Database

Creates a complete JSON backup of all your data.

### How to Run:

```bash
npx tsx scripts/backup-database.ts
```

### What it does:
- Exports all database tables to JSON format
- Creates timestamped backup file in `backups/` folder
- Also creates `backups/latest.json` for convenience
- Shows summary of exported records

### Output:
- File: `backups/database-backup-YYYY-MM-DD-HHmmss.json`
- Latest: `backups/latest.json`

### Download the backup:
1. Find the backup file in the `backups/` folder in Files panel
2. Right-click on it
3. Select "Download"

---

## 🔄 Restore Database

Restores your database from a backup file.

### How to Run:

```bash
# Restore from latest backup
npx tsx scripts/restore-database.ts

# Restore from specific backup file
npx tsx scripts/restore-database.ts backups/database-backup-2024-11-02-16-30-00.json
```

### ⚠️ WARNING:
- This will DELETE all existing data
- You have 5 seconds to cancel (Ctrl+C)
- Use with caution!

---

## 📊 What Gets Backed Up:

✅ All tables including:
- Users & Authentication
- Properties & Rooms
- Guests & Bookings
- Enquiries
- Bills & Financial Records
- Menu Items & Food Orders
- Messages & Communications
- Lease Agreements & Payments
- Expenses & P&L Data
- Staff & Salary Management
- Travel Agents

---

## 💡 Usage Tips:

### Regular Backups:
Run backup before major changes:
```bash
npx tsx scripts/backup-database.ts
```

### Before Republishing:
Always create a backup before republishing:
```bash
npx tsx scripts/backup-database.ts
```

### Testing Restores:
Test your backup works:
```bash
npx tsx scripts/restore-database.ts backups/latest.json
```

---

## 🔐 Security Notes:

- Backup files contain ALL your data including user information
- Keep backup files secure
- Don't share backup files publicly
- Download backups to a safe location

---

## Quick Reference:

| Task | Command |
|------|---------|
| Create backup | `npx tsx scripts/backup-database.ts` |
| Restore latest | `npx tsx scripts/restore-database.ts` |
| Restore specific | `npx tsx scripts/restore-database.ts backups/filename.json` |
