# RaktSetu — Project Presentation Slide Deck
### CS203: Database Management Systems | SVNIT Surat (B.Tech. II CSE Semester-III)

---

## Slide 1: Title & Academic Credentials
- **Header:** Sardar Vallabhbhai National Institute of Technology (SVNIT), Surat
- **Department:** Department of Computer Science and Engineering
- **Project Title:** RaktSetu
- **Subtitle:** Intelligent Blood Donor & Emergency Request Matcher & Blood Bank Inventory Management System
- **Course:** CS203 — Database Management Systems (Academic Year: 2026-27)
- **Team Name:** [Insert Your Registered Team Name]
- **Team Members:**
  - Lavanya Choukiker (Roll No: [Insert])
  - Tanisha Vasa (Roll No: [Insert])
  - [Third Member Name] (Roll No: [Insert])
- **Faculty Guide / Evaluator:** Department of Computer Science & Engineering, SVNIT Surat

> **Speaker Notes:**
> "Good morning respected professors and evaluators. Today, our team presents RaktSetu, an enterprise relational database application designed to eliminate emergency blood match latency, prevent clinical cooldown violations, and provide real-time unit-level blood bank inventory tracking."

---

## Slide 2: Problem Statement & Motivation
- **Clinical Cooldown Violations:** Whole blood donors require a mandatory 90-day biological gap. Static directories and social media forwards lead to premature donation attempts and last-minute hospital rejections.
- **Emergency Latency:** Traditional blood search involves calling lists of unverified donors one-by-one during critical golden hours.
- **Privacy Breaches:** Broadcasting patient and donor numbers on social channels causes privacy violations and harassment.
- **Inventory Blind Spots & Expiry:** Blood units have a strict 42-day shelf life. Unmonitored units expire in hospital refrigerators while neighboring ICUs face fatal stockouts.
- **Lack of Verifiable Auditability:** Manual paper logs fail to provide an immutable trail of transfers and license approvals.

> **Speaker Notes:**
> "Blood shortages are often not just a supply crisis, but an information matching and inventory management crisis. Our motivation was to enforce clinical constraints and inventory management strictly at the database engine level, rather than relying solely on frontend code."

---

## Slide 3: Full-Stack Architecture & Technology Stack
- **Database Engine:** MySQL 8.0 Community Server (Hosted on Aiven Cloud Cluster with TLS/SSL encryption)
- **Backend Framework:** Node.js + Express 5 REST API Gateway (33 Active Endpoints)
- **Database Driver:** `mysql2/promise` with asynchronous connection pooling & prepared statements
- **Security & Cryptography:** 
  - Salted Bcrypt password hashing (10 rounds)
  - Stateless JSON Web Tokens (JWT) for role-based session control
  - Zero SQL injection vulnerability (100% parameter-bound queries)
- **Frontend Framework:** React 18 (Vite 5.4 + Tailwind CSS 3.4)
- **Data Analytics:** Recharts interactive visual analytics

> **Speaker Notes:**
> "Our architecture decouples frontend presentation, backend REST routing, and database persistence. The backend communicates with an Aiven Cloud MySQL 8.0 cluster using TLS-encrypted connection pools."

---

## Slide 4: Conceptual Design — Entity-Relationship (ER) Model
- **17 Relational Tables + 1 Inferred Entity**
- **28 Declared Foreign Key Constraints**
- **Multi-Category Architecture:**
  - *Lookup Entities:* `blood_groups`, `cities`, `roles`
  - *Core Profile Entities:* `donors`, `hospitals`, `users`
  - *Inventory Tracking:* `units` (Barcoded Bags), `inventory_thresholds`
  - *Emergency & Logistics Transactions:* `requests`, `donations`, `transfers`
  - *Many-to-Many Junctions:* `camp_registrations`, `request_notified`, `request_accepted`, `request_declined`
  - *Forensic Governance:* `audit_logs` (Polymorphic trigger-driven trail)

> **Speaker Notes:**
> "The ER model maps every aspect of donor recruitment, hospital inventory, emergency triage, and inter-hospital logistics. We resolved all many-to-many associations through dedicated junction tables."

---

## Slide 5: Cardinality Mapping & Design Rationale
- **Key Cardinalities:**
  - `donors` $\rightarrow$ `donations` : $1 : N$ (One donor, multiple lifetime donations)
  - `hospitals` $\rightarrow$ `units` : $1 : N$ (Hospital manages inventory bags)
  - `requests` $\rightarrow$ `request_notified` : $1 : N$ (Emergency alert reaches multiple candidate donors)
  - `donors` $\rightarrow$ `request_accepted` : $1 : N$ (Explicit donor opt-in)
  - `hospitals` $\rightarrow$ `hospitals` via `transfers` : Role-based self-association (`source_hospital_id`, `dest_hospital_id`)
- **Design Innovation — 3-State Response Junction:**
  - Replaces a single status column with 3 discrete tables (`request_notified`, `request_accepted`, `request_declined`)
  - Prevents database row-lock contention when multiple donors respond simultaneously
  - Enforces donor privacy: the hospital application cannot query a donor's phone number until an explicit record exists in `request_accepted`.

> **Speaker Notes:**
> "Notice our 3-state emergency response design. By isolating notified, accepted, and declined donors into separate junction tables with unique composite keys, we eliminate update locks during emergencies and enforce privacy by design."

---

## Slide 6: Logical Design & Normalization (3NF & BCNF)
- **1NF:** Every column contains atomic scalar values; unique primary keys on all tables.
- **2NF:** All non-prime attributes in composite-key tables (e.g., `inventory_thresholds`) are fully functionally dependent on the entire composite key.
- **3NF Elimination of Transitive Dependencies:**
  - In an unnormalized design, `donors` and `hospitals` store city, state, and geographic coordinates.
  - Functional dependency: `donor_id -> city` and `city -> state, latitude, longitude`.
  - Transitive dependency: `donor_id -> {state, latitude, longitude}` through `city`.
  - **Resolution:** Decomposed into an independent relation: `cities(name, state, latitude, longitude)`.
- **BCNF Compliance:** In every functional dependency $X \rightarrow Y$ across all 17 tables, $X$ is a superkey (PK or unique candidate key).

> **Speaker Notes:**
> "We rigorously normalized our schema to BCNF. For instance, decomposing the cities table eliminated transitive functional dependencies and ensures that updating city GPS coordinates never causes update anomalies in donor or hospital records."

---

## Slide 7: Physical Design — Domain & Integrity Constraints
- **Table CHECK Constraints:**
  - `chk_donor_phone`: Enforces 10-digit numeric format (`CHECK (phone REGEXP '^[0-9]{10}$')`)
  - `chk_donor_weight`: Minimum donor body mass (`CHECK (weight_kg >= 45.0)`)
  - `chk_threshold_range`: Inventory safety threshold (`CHECK (threshold BETWEEN 0 AND 100)`)
  - `chk_unit_expiry`: Enforces biological shelf life (`CHECK (expiry > collected_at)`)
  - `chk_req_units`: Unit request sanity limit (`CHECK (units_needed BETWEEN 1 AND 10)`)
- **Referential Actions:**
  - Safe Cascades (`ON UPDATE CASCADE`)
  - Critical Restraints (`ON DELETE RESTRICT` on blood groups, cities, and completed donations)
  - Nullifying Parent Links (`ON DELETE SET NULL` on users linking to deleted profiles)

> **Speaker Notes:**
> "Physical database integrity is enforced via 8 table CHECK constraints, regex pattern validators, and strict referential actions. No malformed phone number or sub-45kg donor can be saved in our database."

---

## Slide 8: Database Depth — Clinical Triggers
1. **`trg_check_donor_age` (`BEFORE INSERT ON donors`):**
   - Rejects donors $<18$ or $>65$ years old via `SIGNAL SQLSTATE '45000'`.
2. **`trg_check_donation_cooldown` (`BEFORE INSERT ON donations`):**
   - Reads donor's `last_donation`. If `DATEDIFF(collected_at, last_donation) < 90`, aborts statement with custom clinical error message: *"Clinical cooldown violated: Donor donated within the last 90 days."*
3. **`trg_after_donation_completed` (`AFTER INSERT ON donations`):**
   - Automatically advances `next_eligible_date` by +90 days.
   - Increments cumulative `donation_count`.
   - Generates an `AVAILABLE` unit bag row with a 42-day expiration date.
   - Writes an immutable record to `audit_logs`.
4. **`trg_audit_request_status` & `trg_audit_hospital_status`:**
   - Logs request lifecycle transitions (`OPEN` $\rightarrow$ `PARTIAL` $\rightarrow$ `FULFILLED`) and hospital license approvals.

> **Speaker Notes:**
> "Our triggers act as active clinical guardians. Even if someone bypasses our frontend and executes raw SQL, the database engine will reject a donation if the 90-day cooldown is violated."

---

## Slide 9: Stored Procedures, Scheduled Events & Views
- **`sp_match_emergency_donors` (Smart Matching Engine):**
  - Evaluates ABO/Rh compatibility: universal donor `O-` matches all; exact matches prioritized.
  - Filters active donors in the same city who have passed the 90-day cooldown.
  - Sorts candidates: exact blood matches first, rare groups (`is_rare DESC`), and longest time since last donation.
- **`sp_interhospital_transfer` (ACID Atomic Stock Transfer):**
  - Executes unit reassignment, transfer logging, and audit tracking inside `START TRANSACTION ... COMMIT`.
  - `EXIT HANDLER FOR SQLEXCEPTION` executes `ROLLBACK` on error.
- **`evt_daily_unit_auto_expiry`:**
  - Automated MySQL Event running every midnight; marks bags with `expiry <= NOW()` as `EXPIRED`.
- **Analytical Views:**
  - `v_blood_stock_summary`: Threshold status (`ADEQUATE`, `LOW_STOCK`, `OUT_OF_STOCK`).
  - `v_donor_leaderboard`: `DENSE_RANK()` assigning Bronze, Silver, Gold badges.
  - `v_eligible_donors`: Active donor directory filtered by medical eligibility.

> **Speaker Notes:**
> "We leverage stored procedures for complex business transactions and analytical views for high-performance dashboard aggregation without redundant queries."

---

## Slide 10: Performance Optimization & Testing Results
- **B-Tree Composite Indexes:**
  - `idx_donor_match` on `(city, blood_group, available, active)` (emergency matcher)
  - `idx_unit_stock` on `(hospital_id, blood_group, status, expiry)` (stock view aggregation)
  - `idx_request_urgency` on `(status, urgency, city)` (emergency triage)
  - `idx_donation_history` on `(donor_id, collected_at)` (eliminates filesort)
- **Empirical Test Verification:**
  - Independent test suite executed against live Aiven Cloud MySQL instance:
  - **84 / 84 Automated Empirical Checks Passed (100% Success, 0 Failures)**.

> **Speaker Notes:**
> "Every single query has been optimized with composite B-Tree indexes adhering to leftmost-prefix rules. Our independent test suite verified 84 empirical checks across schemas, constraints, procedures, and triggers."

---

## Slide 11: Summary, Live Demonstration & Conclusion
- **Summary of Achievements:**
  - Complete integration of DBMS theory into a working, deployed healthcare platform.
  - Strict BCNF normalization with zero data anomalies.
  - End-to-end full-stack prototype: React 18 + Express 5 + Cloud MySQL 8.0.
- **Live Demonstration Scenarios:**
  - *Demo 1:* Call emergency matching procedure `sp_match_emergency_donors`.
  - *Demo 2:* Query analytical view `v_blood_stock_summary`.
  - *Demo 3:* Execute atomic inter-hospital transfer `sp_interhospital_transfer`.
  - *Demo 4:* Trigger rejection demonstration (90-day cooldown violation with `SQLSTATE 45000`).
- **Conclusion:** RaktSetu proves that modern relational databases can actively safeguard clinical rules, automate logistics, and save human lives.

> **Speaker Notes:**
> "Thank you. We are now pleased to demonstrate the live system and answer any technical questions regarding our database design."
