-- ============================================================================
-- RaktSetu – Advanced Database Logic
-- Course: CS203 DBMS | SVNIT Surat
-- Features: Clinical Triggers, Daily Expiry Event, Inter-Hospital Transfer
--           Transaction, Smart Matching Engine, and Analytical Views
-- ============================================================================

USE `blood_donor_db`;

-- Enable MySQL Event Scheduler for background events
SET GLOBAL event_scheduler = ON;

-- Clean re-execution drops
DROP TRIGGER IF EXISTS `trg_check_donation_cooldown`;
DROP TRIGGER IF EXISTS `trg_check_donor_age`;
DROP TRIGGER IF EXISTS `trg_after_donation_completed`;
DROP TRIGGER IF EXISTS `trg_audit_request_status`;
DROP TRIGGER IF EXISTS `trg_audit_hospital_status`;
DROP EVENT IF EXISTS `evt_daily_unit_auto_expiry`;
DROP PROCEDURE IF EXISTS `sp_interhospital_transfer`;
DROP PROCEDURE IF EXISTS `sp_match_emergency_donors`;
DROP VIEW IF EXISTS `v_blood_stock_summary`;
DROP VIEW IF EXISTS `v_donor_leaderboard`;
DROP VIEW IF EXISTS `v_eligible_donors`;

DELIMITER $$

-- ============================================================================
-- 1. TRIGGERS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Trigger 0: Clinical Age Requirement (18 - 65 years) (BEFORE INSERT)
-- ----------------------------------------------------------------------------
CREATE TRIGGER `trg_check_donor_age`
BEFORE INSERT ON `donors`
FOR EACH ROW
BEGIN
  DECLARE v_age INT;
  SET v_age = TIMESTAMPDIFF(YEAR, NEW.dob, CURDATE());
  IF v_age < 18 OR v_age > 65 THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Validation error: Donor age must be between 18 and 65 years.';
  END IF;
END$$

-- ----------------------------------------------------------------------------
-- Trigger 1: Clinical 90-Day Cooldown Enforcement (BEFORE INSERT)
-- Rejects donations if the donor has donated blood within the previous 90 days.
-- ----------------------------------------------------------------------------
CREATE TRIGGER `trg_check_donation_cooldown`
BEFORE INSERT ON `donations`
FOR EACH ROW
BEGIN
  DECLARE v_last_donation DATETIME;
  DECLARE v_days_diff INT;

  -- Read donor's previous donation timestamp
  SELECT `last_donation` INTO v_last_donation
  FROM `donors`
  WHERE `id` = NEW.donor_id;

  IF v_last_donation IS NOT NULL THEN
    SET v_days_diff = DATEDIFF(NEW.collected_at, v_last_donation);
    IF v_days_diff < 90 THEN
      SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Clinical cooldown violated: Donor donated within the last 90 days.';
    END IF;
  END IF;
END$$

-- ----------------------------------------------------------------------------
-- Trigger 2: Automated Donor Sync & Unit Creation (AFTER INSERT)
-- Automatically increments donor donation count, calculates next eligible date,
-- generates AVAILABLE blood units with a 42-day expiry date, and writes an audit log.
-- ----------------------------------------------------------------------------
CREATE TRIGGER `trg_after_donation_completed`
AFTER INSERT ON `donations`
FOR EACH ROW
BEGIN
  DECLARE v_blood_group VARCHAR(3);
  DECLARE v_barcode VARCHAR(50);

  IF NEW.status = 'COMPLETED' THEN
    -- A. Update donor record
    UPDATE `donors`
    SET `last_donation` = NEW.collected_at,
        `next_eligible_date` = DATE_ADD(NEW.collected_at, INTERVAL 90 DAY),
        `donation_count` = `donation_count` + NEW.units
    WHERE `id` = NEW.donor_id;

    -- B. Lookup donor blood group
    SELECT `blood_group` INTO v_blood_group
    FROM `donors`
    WHERE `id` = NEW.donor_id;

    -- C. Generate unique barcode and insert blood unit (42 days whole blood shelf life)
    SET v_barcode = CONCAT('BAG-', DATE_FORMAT(NEW.collected_at, '%Y%m%d'), '-', SUBSTRING(UUID(), 1, 8));

    INSERT INTO `units` (
      `id`, `bag_barcode`, `hospital_id`, `blood_group`, `component`, `collected_at`, `expiry`, `status`
    ) VALUES (
      UUID(),
      v_barcode,
      NEW.hospital_id,
      v_blood_group,
      'WHOLE_BLOOD',
      NEW.collected_at,
      DATE_ADD(NEW.collected_at, INTERVAL 42 DAY),
      'AVAILABLE'
    );

    -- D. Log in Audit Trail
    INSERT INTO `audit_logs` (
      `entity`, `entity_id`, `action`, `performed_by`, `role`, `detail`
    ) VALUES (
      'donations',
      NEW.id,
      'RECORD_DONATION',
      NEW.hospital_id,
      'hospital',
      CONCAT('Recorded donation of ', NEW.units, ' unit(s) of ', v_blood_group, ' from donor ID ', NEW.donor_id)
    );
  END IF;
END$$

-- ----------------------------------------------------------------------------
-- Trigger 3: Request Lifecycle Audit (AFTER UPDATE)
-- Logs status transitions (e.g. OPEN -> PARTIAL -> FULFILLED)
-- ----------------------------------------------------------------------------
CREATE TRIGGER `trg_audit_request_status`
AFTER UPDATE ON `requests`
FOR EACH ROW
BEGIN
  IF OLD.status <> NEW.status THEN
    INSERT INTO `audit_logs` (
      `entity`, `entity_id`, `action`, `performed_by`, `role`, `detail`
    ) VALUES (
      'requests',
      NEW.id,
      'STATUS_CHANGE',
      NEW.hospital_id,
      'hospital',
      CONCAT('Request status changed from ', OLD.status, ' to ', NEW.status)
    );
  END IF;
END$$

-- ----------------------------------------------------------------------------
-- Trigger 4: Hospital Approval Audit (AFTER UPDATE)
-- Logs admin verification of hospital license
-- ----------------------------------------------------------------------------
CREATE TRIGGER `trg_audit_hospital_status`
AFTER UPDATE ON `hospitals`
FOR EACH ROW
BEGIN
  IF OLD.status <> NEW.status THEN
    INSERT INTO `audit_logs` (
      `entity`, `entity_id`, `action`, `performed_by`, `role`, `detail`
    ) VALUES (
      'hospitals',
      NEW.id,
      'HOSPITAL_STATUS_UPDATE',
      'system_admin',
      'admin',
      CONCAT('Hospital status updated from ', OLD.status, ' to ', NEW.status)
    );
  END IF;
END$$

-- ============================================================================
-- 2. STORED PROCEDURES (With ACID Transaction Support)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Procedure 1: Inter-Hospital Blood Stock Transfer (Atomic Transaction)
-- Atomically transfers a verified blood unit between two hospitals.
-- ----------------------------------------------------------------------------
CREATE PROCEDURE `sp_interhospital_transfer`(
  IN  p_source_hospital_id VARCHAR(36),
  IN  p_dest_hospital_id   VARCHAR(36),
  IN  p_unit_id            VARCHAR(36),
  IN  p_notes              TEXT,
  OUT p_success            BOOLEAN,
  OUT p_message            VARCHAR(255)
)
proc_label: BEGIN
  DECLARE v_unit_exists INT DEFAULT 0;
  DECLARE v_transfer_id VARCHAR(36);

  -- Exception handler: rollback on any SQL error
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    SET p_success = FALSE;
    SET p_message = 'Transaction aborted: SQL Exception occurred during transfer.';
  END;

  -- 1. Validate that unit belongs to source hospital and is AVAILABLE
  SELECT COUNT(*) INTO v_unit_exists
  FROM `units`
  WHERE `id` = p_unit_id 
    AND `hospital_id` = p_source_hospital_id 
    AND `status` = 'AVAILABLE'
    AND `expiry` > NOW();

  IF v_unit_exists = 0 THEN
    SET p_success = FALSE;
    SET p_message = 'Transfer failed: Blood unit not available at source hospital or expired.';
    LEAVE proc_label;
  END IF;

  -- 2. Begin ACID Transaction
  START TRANSACTION;

    -- Assign unit to destination hospital
    UPDATE `units`
    SET `hospital_id` = p_dest_hospital_id,
        `status` = 'AVAILABLE'
    WHERE `id` = p_unit_id;

    -- Record transfer record
    SET v_transfer_id = UUID();
    INSERT INTO `transfers` (
      `id`, `source_hospital_id`, `dest_hospital_id`, `unit_id`, `status`, `completed_at`, `notes`
    ) VALUES (
      v_transfer_id,
      p_source_hospital_id,
      p_dest_hospital_id,
      p_unit_id,
      'COMPLETED',
      NOW(),
      p_notes
    );

    -- Log in Audit Trail
    INSERT INTO `audit_logs` (
      `entity`, `entity_id`, `action`, `performed_by`, `role`, `detail`
    ) VALUES (
      'transfers',
      v_transfer_id,
      'INTERHOSPITAL_TRANSFER',
      p_source_hospital_id,
      'hospital',
      CONCAT('Transferred unit ID ', p_unit_id, ' to destination hospital ID ', p_dest_hospital_id)
    );

  COMMIT;

  SET p_success = TRUE;
  SET p_message = 'Blood unit transferred successfully.';
END$$

-- ----------------------------------------------------------------------------
-- Procedure 2: Smart Emergency Donor Matching Engine
-- Matches blood request with eligible donors in the same city using ABO compatibility,
-- 90-day cooldown check, and priority ranking for rare blood groups.
-- ----------------------------------------------------------------------------
CREATE PROCEDURE `sp_match_emergency_donors`(IN p_request_id VARCHAR(36))
BEGIN
  DECLARE v_city VARCHAR(50);
  DECLARE v_blood_group VARCHAR(3);
  DECLARE v_units_needed INT;

  -- Fetch request details
  SELECT `city`, `blood_group`, `units_needed`
  INTO v_city, v_blood_group, v_units_needed
  FROM `requests`
  WHERE `id` = p_request_id;

  -- Query compatible donors with priority ranking
  SELECT 
    d.`id` AS `donor_id`,
    d.`name` AS `donor_name`,
    d.`phone`,
    d.`email`,
    d.`blood_group`,
    d.`city`,
    d.`area`,
    d.`last_donation`,
    COALESCE(DATEDIFF(CURRENT_DATE, d.`last_donation`), 999) AS `days_since_last_donation`,
    bg.`is_rare`,
    CASE 
      WHEN d.`blood_group` = v_blood_group THEN 'EXACT'
      ELSE 'COMPATIBLE'
    END AS `match_type`
  FROM `donors` d
  JOIN `blood_groups` bg ON d.`blood_group` = bg.`code`
  WHERE d.`city` = v_city
    AND d.`active` = TRUE
    AND d.`available` = TRUE
    AND (d.`last_donation` IS NULL OR DATEDIFF(CURRENT_DATE, d.`last_donation`) >= 90)
    AND (
      -- Universal donor O- can donate to all
      d.`blood_group` = 'O-'
      -- Exact match
      OR d.`blood_group` = v_blood_group
      -- Patient A+ can receive from A-, O+
      OR (v_blood_group = 'A+' AND d.`blood_group` IN ('A-', 'O+'))
      -- Patient B+ can receive from B-, O+
      OR (v_blood_group = 'B+' AND d.`blood_group` IN ('B-', 'O+'))
      -- Universal recipient AB+ can receive from any group
      OR (v_blood_group = 'AB+')
      -- Patient AB- can receive from A-, B-
      OR (v_blood_group = 'AB-' AND d.`blood_group` IN ('A-', 'B-'))
      -- Patient O+ can receive from O-
      OR (v_blood_group = 'O+' AND d.`blood_group` = 'O-')
    )
  ORDER BY 
    CASE WHEN d.`blood_group` = v_blood_group THEN 0 ELSE 1 END,
    bg.`is_rare` DESC,
    d.`last_donation` ASC
  LIMIT 25;
END$$

DELIMITER ;

-- ============================================================================
-- 3. SCHEDULED EVENT (Background Automation)
-- Automatically scans and expires blood bags past their shelf life every midnight.
-- ============================================================================
CREATE EVENT IF NOT EXISTS `evt_daily_unit_auto_expiry`
ON SCHEDULE EVERY 1 DAY
STARTS (TIMESTAMP(CURRENT_DATE) + INTERVAL 1 DAY)
COMMENT 'Automatically flags expired blood bags in inventory every day'
DO
  UPDATE `units`
  SET `status` = 'EXPIRED'
  WHERE `status` = 'AVAILABLE'
    AND `expiry` <= NOW();

-- ============================================================================
-- 4. ANALYTICAL VIEWS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- View 1: Real-time Blood Stock Summary by Hospital & Group
-- Demonstrates threshold monitoring and low-stock alert flags.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW `v_blood_stock_summary` AS
SELECT 
  h.`id` AS `hospital_id`,
  h.`name` AS `hospital_name`,
  h.`city`,
  bg.`code` AS `blood_group`,
  bg.`is_rare`,
  COUNT(u.`id`) AS `available_units`,
  COALESCE(t.`threshold`, 8) AS `min_threshold`,
  CASE 
    WHEN COUNT(u.`id`) = 0 THEN 'OUT_OF_STOCK'
    WHEN COUNT(u.`id`) < COALESCE(t.`threshold`, 8) THEN 'LOW_STOCK'
    ELSE 'ADEQUATE'
  END AS `stock_status`
FROM `hospitals` h
CROSS JOIN `blood_groups` bg
LEFT JOIN `inventory_thresholds` t 
  ON h.`id` = t.`hospital_id` AND bg.`code` = t.`blood_group`
LEFT JOIN `units` u 
  ON h.`id` = u.`hospital_id` 
  AND bg.`code` = u.`blood_group` 
  AND u.`status` = 'AVAILABLE' 
  AND u.`expiry` > NOW()
WHERE h.`status` = 'APPROVED'
GROUP BY h.`id`, h.`name`, h.`city`, bg.`code`, bg.`is_rare`, t.`threshold`;

-- ----------------------------------------------------------------------------
-- View 2: Donor Badges & Leaderboard
-- Awards Bronze (3+), Silver (5+), and Gold (10+) badges based on donation count.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW `v_donor_leaderboard` AS
SELECT 
  d.`id` AS `donor_id`,
  d.`name` AS `donor_name`,
  d.`city`,
  d.`blood_group`,
  d.`donation_count`,
  CASE 
    WHEN d.`donation_count` >= 10 THEN 'GOLD'
    WHEN d.`donation_count` >= 5  THEN 'SILVER'
    WHEN d.`donation_count` >= 3  THEN 'BRONZE'
    ELSE 'NONE'
  END AS `badge`,
  d.`last_donation`,
  d.`next_eligible_date`,
  CASE 
    WHEN d.`next_eligible_date` IS NULL OR d.`next_eligible_date` <= CURRENT_DATE THEN 0
    ELSE DATEDIFF(d.`next_eligible_date`, CURRENT_DATE)
  END AS `days_until_eligible`,
  DENSE_RANK() OVER (ORDER BY d.`donation_count` DESC, d.`last_donation` ASC) AS `leaderboard_rank`
FROM `donors` d
WHERE d.`active` = TRUE;

-- ----------------------------------------------------------------------------
-- View 3: Medically Eligible Donors Directory
-- Evaluates eligibility countdown and clinical constraints.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW `v_eligible_donors` AS
SELECT 
  d.`id` AS `donor_id`,
  d.`name`,
  d.`gender`,
  d.`blood_group`,
  d.`city`,
  d.`phone`,
  TIMESTAMPDIFF(YEAR, d.`dob`, CURDATE()) AS `age`,
  d.`weight_kg`,
  d.`last_donation`,
  COALESCE(DATEDIFF(CURRENT_DATE, d.`last_donation`), 999) AS `days_since_last_donation`
FROM `donors` d
WHERE d.`active` = TRUE 
  AND d.`available` = TRUE
  AND d.`weight_kg` >= 45.0
  AND (d.`last_donation` IS NULL OR DATEDIFF(CURRENT_DATE, d.`last_donation`) >= 90);
