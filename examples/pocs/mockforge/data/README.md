# Mock Services Data Directory

This directory contains the SQLite database for mock data persistence.

## Files

- `mock-data.db` - SQLite database (auto-generated)
- `.gitkeep` - Keeps directory in git

## Database Schema

```sql
CREATE TABLE mock_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  system TEXT NOT NULL,
  record_id TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(system, record_id)
);
```

## Resetting Data

```bash
# Remove database
rm data/mock-data.db

# Reseed from CSV files
pnpm run data:seed
```

## Inspecting Data

```bash
# Open database
sqlite3 data/mock-data.db

# View tables
.tables

# Count records by system
SELECT system, COUNT(*) FROM mock_records GROUP BY system;

# View sample records
SELECT * FROM mock_records LIMIT 10;
```
