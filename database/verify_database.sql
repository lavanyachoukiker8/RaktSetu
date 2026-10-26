-- ============================================================================
-- RaktSetu – DBMS Verification & Demonstration Test Suite
-- Course: CS203 DBMS | SVNIT Surat
-- Use these queries during the live practical demonstration / viva evaluation.
-- ============================================================================

USE `blood_donor_db`;

-- ----------------------------------------------------------------------------
-- TEST 1: Smart Emergency Matching Engine (Stored Procedure)
-- Matches donors in Surat for Request 'req-01' (B+ Critical request)
-- Demonstrates ABO compatibility, city filter, 90-day cooldown & rare priority.
-- ----------------------------------------------------------------------------
SELECT '--- TEST 1: SMART MATCHING PROCEDURE OUTPUT ---' AS `Demonstration`;
CALL sp_match_emergency_donors('req-01');

-- ----------------------------------------------------------------------------
-- TEST 2: Real-time Blood Stock Summary View
-- Demonstrates hospital unit inventory, safe thresholds, and LOW_STOCK flags.
-- ----------------------------------------------------------------------------
SELECT '--- TEST 2: BLOOD STOCK SUMMARY BY HOSPITAL & GROUP ---' AS `Demonstration`;
SELECT * FROM `v_blood_stock_summary`
WHERE `hospital_id` IN ('hosp-01', 'hosp-02')
ORDER BY `hospital_name`, `blood_group`;

-- ----------------------------------------------------------------------------
-- TEST 3: Donor Leaderboard & Badge Calculation View
-- Demonstrates BRONZE (3+), SILVER (5+), GOLD (10+) badges and rank.
-- ----------------------------------------------------------------------------
SELECT '--- TEST 3: DONOR LEADERBOARD & BADGES ---' AS `Demonstration`;
SELECT `leaderboard_rank`, `donor_name`, `city`, `blood_group`, `donation_count`, `badge`, `days_until_eligible`
FROM `v_donor_leaderboard`
LIMIT 10;

-- ----------------------------------------------------------------------------
-- TEST 4: Medically Eligible Donors View
-- Demonstrates age (18-65), weight (>=45kg), and cooldown (>=90 days) filters.
-- ----------------------------------------------------------------------------
SELECT '--- TEST 4: ELIGIBLE DONORS DIRECTORY ---' AS `Demonstration`;
SELECT `donor_id`, `name`, `blood_group`, `city`, `age`, `weight_kg`, `days_since_last_donation`
FROM `v_eligible_donors`
WHERE `city` = 'Surat';

-- ----------------------------------------------------------------------------
-- TEST 5: Atomic Inter-Hospital Transfer (ACID Transaction Procedure)
-- Moves a blood unit from Civil Hospital to Lifeline Hospital atomically.
-- ----------------------------------------------------------------------------
SELECT '--- TEST 5: INTER-HOSPITAL TRANSFER TRANSACTION ---' AS `Demonstration`;
CALL sp_interhospital_transfer(
  'hosp-01',                 -- Source: Civil Hospital Surat
  'hosp-02',                 -- Destination: Lifeline Hospital Surat
  'unit-01',                 -- Unit: A+ Whole Blood bag
  'Emergency transfer for surgical ICU demand',
  @p_success,
  @p_message
);
SELECT @p_success AS `Transfer_Successful`, @p_message AS `Status_Message`;

-- Verify unit's new hospital location in DB
SELECT `id`, `bag_barcode`, `hospital_id`, `blood_group`, `status`
FROM `units`
WHERE `id` = 'unit-01';

-- ----------------------------------------------------------------------------
-- TEST 6: Clinical 90-Day Cooldown Trigger Enforcement (Deliberate Violation)
-- Attempting to record a donation for Priya Shah (donor-02), who donated
-- only 21 days ago. THIS INSERT MUST FAIL WITH SQLSTATE 45000!
-- ----------------------------------------------------------------------------
SELECT '--- TEST 6: COOLDOWN TRIGGER REJECTION (EXPECTED ERROR) ---' AS `Demonstration`;

-- UNCOMMENT THE FOLLOWING LINE TO DEMONSTRATE TRIGGER REJECTION TO EXAMINER:
-- INSERT INTO `donations` (`id`, `donor_id`, `hospital_id`, `units`, `collected_at`, `status`)
-- VALUES (UUID(), 'donor-02', 'hosp-01', 1, NOW(), 'COMPLETED');

-- ----------------------------------------------------------------------------
-- TEST 7: Audit Log Verification
-- Proves all automated system events and user actions are logged in audit_logs.
-- ----------------------------------------------------------------------------
SELECT '--- TEST 7: AUDIT TRAIL LOG ---' AS `Demonstration`;
SELECT `id`, `entity`, `action`, `performed_by`, `role`, `detail`, `created_at`
FROM `audit_logs`
ORDER BY `created_at` DESC
LIMIT 10;
