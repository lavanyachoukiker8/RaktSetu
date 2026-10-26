# RaktSetu – Database Architecture & Setup Guide
**Course:** CS203 Database Management Systems | SVNIT Surat  
**Project:** Blood Donor & Emergency Request Matcher & Blood Bank Inventory System  
**Cloud Hosting:** Aiven Cloud MySQL (with TLS / SSL)

---

## 📁 Database File Structure

| File | Purpose |
| :--- | :--- |
| **[`schema.sql`](schema.sql)** | Full relational schema: 16 tables, Primary Keys, Foreign Keys, cascading rules, domain `CHECK` constraints, and performance B-Tree indices. |
| **[`reference-data.sql`](reference-data.sql)** | Immutable lookup data: 8 blood groups (with rare group flags), 5 cities (with geo-coordinates for distance calculation), and system roles. |
| **[`triggers_and_views.sql`](triggers_and_views.sql)** | **Advanced RDBMS features**: Clinical 90-day cooldown trigger, inventory auto-sync trigger, audit trigger, MySQL daily unit auto-expiry `EVENT`, inter-hospital transfer transaction procedure (`sp_interhospital_transfer`), smart matching procedure (`sp_match_emergency_donors`), and analytical views (`v_blood_stock_summary`, `v_donor_leaderboard`, `v_eligible_donors`). |
| **[`seed.sql`](seed.sql)** | Realistic seed data: 20 registered donors (Surat, Ahmedabad, etc.), 6 hospitals, 17 unit bags, thresholds, active requests, camps, and audit logs. |
| **[`import_to_aiven.js`](import_to_aiven.js)** | **Automated Aiven migrator**: Reads `.env`, connects over TLS using `certs/ca.pem`, and runs all scripts automatically. |
| **[`init_database.sql`](init_database.sql)** | Master all-in-one execution script for local MySQL Workbench or CLI. |
| **[`verify_database.sql`](verify_database.sql)** | Evaluation test suite demonstrating all queries, procedures, triggers, views, and transactions for viva examination. |

---

## ☁️ Option 1: Deploying to Aiven Cloud MySQL (Automated 1-Click)

Your team already committed the Aiven TLS certificate in [`certs/ca.pem`](../certs/ca.pem).

1. Open [`.env`](../.env) and add your Aiven connection parameters from your Aiven Console:
   ```env
   DB_HOST=mysql-xxxx-raktsetu.aivencloud.com
   DB_PORT=23456
   DB_NAME=defaultdb
   DB_USER=avnadmin
   DB_PASSWORD=your_aiven_password
   DB_SSL=true
   ```
2. Run the automated migration script:
   ```bash
   node database/import_to_aiven.js
   ```
   *This script connects securely using `certs/ca.pem`, runs `schema.sql`, `reference-data.sql`, `triggers_and_views.sql`, and `seed.sql`, and outputs verified record counts.*

---

## 💻 Option 2: Deploying to Local MySQL Workbench

1. Open **MySQL Workbench** and connect to your local MySQL instance (port `3306` or `3307`).
2. Choose **File → Open SQL Script…** and select `database/schema.sql`.
3. Press **Execute (Ctrl + Shift + Enter)** to create tables.
4. Execute `database/reference-data.sql`.
5. Execute `database/triggers_and_views.sql`.
6. Execute `database/seed.sql`.
7. Open `database/verify_database.sql` to demonstrate live queries to the examiner.

---

## 🎯 Key DBMS Features to Highlight During Evaluation

1. **Clinical Cooldown Trigger (`trg_check_donation_cooldown`)**:
   - Enforces the mandatory 90-day gap between blood donations. Attempting to insert a donation for a donor who donated $<90$ days ago raises an SQL exception (`SIGNAL SQLSTATE '45000'`).
2. **Atomic Inter-Hospital Stock Transfer (`sp_interhospital_transfer`)**:
   - Executes inside an explicit `START TRANSACTION ... COMMIT` block. Ensures that transferring a blood bag between hospitals either fully succeeds or rolls back atomically.
3. **Daily Unit Auto-Expiry (`evt_daily_unit_auto_expiry`)**:
   - A scheduled background MySQL `EVENT` that runs daily at midnight to mark blood bags past their shelf life (42 days) as `EXPIRED`.
4. **Smart Emergency Matching Engine (`sp_match_emergency_donors`)**:
   - Queries donors using medical blood group compatibility rules, filters by city and active availability, and ranks exact matches and rare blood groups (`O-`, `AB-`) with highest priority.
5. **Real-time Inventory & Low-Stock Alerts View (`v_blood_stock_summary`)**:
   - Aggregates available blood units per hospital and compares against safe thresholds to flag `LOW_STOCK`, `ADEQUATE`, or `OUT_OF_STOCK`.
6. **Donor Badges & Leaderboard View (`v_donor_leaderboard`)**:
   - Dynamically calculates Bronze ($\ge 3$), Silver ($\ge 5$), and Gold ($\ge 10$) donor badges and assigns leaderboard ranks.
