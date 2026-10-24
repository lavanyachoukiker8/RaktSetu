# RaktSetu – Phase 3A Database

## Overview
This folder contains the **SQL schema** and **reference data** required for the RaktSetu backend.

- `schema.sql` – Full relational schema (tables, foreign keys, indexes, constraints).
- `reference-data.sql` – Inserts immutable lookup data (blood groups, cities, roles). Uses `INSERT IGNORE` so the script can be re‑run safely.

## Prerequisites
1. MySQL Server 8.4 must be running locally.
2. Create (or use) a database named `blood_donor_db`:
   ```sql
   CREATE DATABASE IF NOT EXISTS blood_donor_db;
   ```
3. In MySQL Workbench, connect to `localhost:3307` (or your local port) and select `blood_donor_db`.

## Execution Order
```text
1. schema.sql        – creates all tables & indexes.
2. reference-data.sql – populates lookup tables.
```
Run each script **while the `blood_donor_db` database is selected**.

### Running via Workbench GUI
1. Open Workbench and connect.
2. In the left sidebar, double‑click `blood_donor_db` to make it the default schema.
3. Choose **File → Open SQL Script…** and select `database/schema.sql`.
4. Press **Execute (Ctrl+Shift+Enter)**.
5. Repeat for `database/reference-data.sql`.

### Running via CLI (Windows PowerShell)
```powershell
# Ensure you are in the project root (d:\RaktSetu)
cd d:\RaktSetu
# Execute schema
mysql -u root -p -h 127.0.0.1 -P 3307 blood_donor_db < database\schema.sql
# Execute reference data
mysql -u root -p -h 127.0.0.1 -P 3307 blood_donor_db < database\reference-data.sql
```
Replace `-u root` and password as appropriate.

## Verification Queries
```sql
-- List tables
SHOW TABLES;

-- Count reference rows
SELECT COUNT(*) FROM blood_groups;   -- should be 8
SELECT COUNT(*) FROM cities;        -- should be 5
SELECT COUNT(*) FROM roles;         -- should be 3

-- Inspect a foreign key
SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'donors';
```
All `COUNT(*)` queries should return the expected numbers. Foreign‑key query should list the relationships for `donors`.

## Constraint Tests (optional)
```sql
-- Phone must be 10 digits (should fail)
INSERT INTO donors (id, name, gender, dob, phone, blood_group, city) VALUES
('DFAIL', 'Bad Phone', 'Male', '1990-01-01', '12345', 'A+', 'Surat');

-- Age must be 18‑65 (should fail)
INSERT INTO donors (id, name, gender, dob, phone, blood_group, city) VALUES
('DFAIL2', 'Too Young', 'Male', CURDATE() - INTERVAL 5 YEAR, '9876543210', 'A+', 'Surat');
```
Both statements must raise an error.

## Next Steps
- Phase 3B will add stored procedures, triggers, and views to enforce remaining business rules (e.g., 90‑day donation gap, low‑stock view, badge calculation).
- No backend code is added in this phase; the schema is ready for the future API layer.

---
*All files in this folder are tracked by Git and are not ignored by `.gitignore`.*
