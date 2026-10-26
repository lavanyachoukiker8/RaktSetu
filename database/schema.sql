-- ============================================================================
-- RaktSetu – Database Schema (MySQL 8.0+)
-- Course: CS203 Database Management Systems | SVNIT Surat
-- Project: Blood Donor & Emergency Request Matcher & Blood Bank Inventory System
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `blood_donor_db`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `blood_donor_db`;

-- Drop existing tables in reverse dependency order
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `transfers`;
DROP TABLE IF EXISTS `camp_registrations`;
DROP TABLE IF EXISTS `camps`;
DROP TABLE IF EXISTS `request_declined`;
DROP TABLE IF EXISTS `request_accepted`;
DROP TABLE IF EXISTS `request_notified`;
DROP TABLE IF EXISTS `requests`;
DROP TABLE IF EXISTS `donations`;
DROP TABLE IF EXISTS `units`;
DROP TABLE IF EXISTS `inventory_thresholds`;
DROP TABLE IF EXISTS `hospitals`;
DROP TABLE IF EXISTS `donors`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `roles`;
DROP TABLE IF EXISTS `cities`;
DROP TABLE IF EXISTS `blood_groups`;
SET FOREIGN_KEY_CHECKS = 1;

-- ----------------------------------------------------------------------------
-- 1. REFERENCE / LOOKUP TABLES
-- ----------------------------------------------------------------------------

-- Blood Groups lookup table with priority rarity flag
CREATE TABLE `blood_groups` (
  `code` VARCHAR(3) NOT NULL PRIMARY KEY,
  `description` VARCHAR(25) NOT NULL,
  `is_rare` BOOLEAN NOT NULL DEFAULT FALSE
) ENGINE=InnoDB;

-- Cities lookup table with geographical coordinates for proximity calculations
CREATE TABLE `cities` (
  `name` VARCHAR(50) NOT NULL PRIMARY KEY,
  `state` VARCHAR(50) NOT NULL DEFAULT 'Gujarat',
  `latitude` DECIMAL(9,6) NOT NULL,
  `longitude` DECIMAL(9,6) NOT NULL
) ENGINE=InnoDB;

-- System Roles
CREATE TABLE `roles` (
  `id` TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  `name` ENUM('admin', 'donor', 'hospital') NOT NULL UNIQUE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 2. AUTHENTICATION & PROFILES
-- ----------------------------------------------------------------------------

CREATE TABLE `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(100) NOT NULL UNIQUE,
  `email` VARCHAR(150) NULL UNIQUE,
  `phone` CHAR(10) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role_id` TINYINT UNSIGNED NOT NULL,
  `donor_id` VARCHAR(36) NULL,
  `hospital_id` VARCHAR(36) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_user_role` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Registered Donors Profile
CREATE TABLE `donors` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `gender` ENUM('Male', 'Female', 'Other') NOT NULL,
  `dob` DATE NOT NULL,
  `phone` CHAR(10) NOT NULL UNIQUE,
  `email` VARCHAR(150) NULL,
  `blood_group` VARCHAR(3) NOT NULL,
  `city` VARCHAR(50) NOT NULL,
  `area` VARCHAR(150) NULL,
  `pincode` VARCHAR(10) NULL,
  `weight_kg` DECIMAL(5,2) NOT NULL DEFAULT 55.0,
  `available` BOOLEAN NOT NULL DEFAULT TRUE,
  `active` BOOLEAN NOT NULL DEFAULT TRUE,
  `preferred_time` VARCHAR(25) NOT NULL DEFAULT 'Anytime',
  `last_donation` DATETIME NULL,
  `next_eligible_date` DATE NULL,
  `donation_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- Integrity Constraints
  CONSTRAINT `chk_donor_phone` CHECK (`phone` REGEXP '^[0-9]{10}$'),
  CONSTRAINT `chk_donor_weight` CHECK (`weight_kg` >= 45.0),
  CONSTRAINT `fk_donor_group` FOREIGN KEY (`blood_group`) REFERENCES `blood_groups`(`code`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_donor_city` FOREIGN KEY (`city`) REFERENCES `cities`(`name`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Hospitals & Blood Banks Profile
CREATE TABLE `hospitals` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `name` VARCHAR(200) NOT NULL,
  `city` VARCHAR(50) NOT NULL,
  `address` TEXT NOT NULL,
  `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  `license` VARCHAR(100) NOT NULL UNIQUE,
  `phone` CHAR(10) NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `contact_person` VARCHAR(150) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `stock_updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `chk_hospital_phone` CHECK (`phone` REGEXP '^[0-9]{10}$'),
  CONSTRAINT `fk_hospital_city` FOREIGN KEY (`city`) REFERENCES `cities`(`name`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Add foreign keys to users now that donors and hospitals exist
ALTER TABLE `users`
  ADD CONSTRAINT `fk_user_donor` FOREIGN KEY (`donor_id`) REFERENCES `donors`(`id`) ON UPDATE CASCADE ON DELETE SET NULL,
  ADD CONSTRAINT `fk_user_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals`(`id`) ON UPDATE CASCADE ON DELETE SET NULL;

-- ----------------------------------------------------------------------------
-- 3. INVENTORY & UNIT-LEVEL TRACKING
-- ----------------------------------------------------------------------------

-- Custom Low-Stock Thresholds per Hospital per Blood Group
CREATE TABLE `inventory_thresholds` (
  `hospital_id` VARCHAR(36) NOT NULL,
  `blood_group` VARCHAR(3) NOT NULL,
  `threshold` INT UNSIGNED NOT NULL DEFAULT 8,
  PRIMARY KEY (`hospital_id`, `blood_group`),
  CONSTRAINT `fk_thresh_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals`(`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_thresh_group` FOREIGN KEY (`blood_group`) REFERENCES `blood_groups`(`code`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `chk_threshold_range` CHECK (`threshold` BETWEEN 0 AND 100)
) ENGINE=InnoDB;

-- Individual Blood Unit Bags with Barcode & Expiry Tracking
CREATE TABLE `units` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `bag_barcode` VARCHAR(50) NOT NULL UNIQUE,
  `hospital_id` VARCHAR(36) NOT NULL,
  `blood_group` VARCHAR(3) NOT NULL,
  `component` ENUM('WHOLE_BLOOD', 'RBC', 'PLASMA', 'PLATELETS') NOT NULL DEFAULT 'WHOLE_BLOOD',
  `collected_at` DATETIME NOT NULL,
  `expiry` DATETIME NOT NULL,
  `status` ENUM('AVAILABLE', 'RESERVED', 'USED', 'EXPIRED', 'DISCARDED') NOT NULL DEFAULT 'AVAILABLE',
  CONSTRAINT `chk_unit_expiry` CHECK (`expiry` > `collected_at`),
  CONSTRAINT `fk_unit_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals`(`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_unit_group` FOREIGN KEY (`blood_group`) REFERENCES `blood_groups`(`code`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Donation Records logged at Hospital or Camp
CREATE TABLE `donations` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `donor_id` VARCHAR(36) NOT NULL,
  `hospital_id` VARCHAR(36) NOT NULL,
  `units` INT UNSIGNED NOT NULL DEFAULT 1,
  `collected_at` DATETIME NOT NULL,
  `status` ENUM('PENDING', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'COMPLETED',
  `certificate_id` VARCHAR(50) NULL UNIQUE,
  CONSTRAINT `chk_donation_units` CHECK (`units` BETWEEN 1 AND 5),
  CONSTRAINT `fk_donation_donor` FOREIGN KEY (`donor_id`) REFERENCES `donors`(`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_donation_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals`(`id`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 4. EMERGENCY REQUESTS & SMART MATCHING
-- ----------------------------------------------------------------------------

CREATE TABLE `requests` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `hospital_id` VARCHAR(36) NULL,
  `hospital_name` VARCHAR(200) NOT NULL,
  `city` VARCHAR(50) NOT NULL,
  `patient_name` VARCHAR(150) NOT NULL,
  `blood_group` VARCHAR(3) NOT NULL,
  `units_needed` INT UNSIGNED NOT NULL,
  `urgency` ENUM('NORMAL', 'URGENT', 'CRITICAL') NOT NULL DEFAULT 'NORMAL',
  `status` ENUM('OPEN', 'PARTIAL', 'FULFILLED', 'CANCELLED') NOT NULL DEFAULT 'OPEN',
  `required_by` DATETIME NOT NULL,
  `contact_person` VARCHAR(150) NOT NULL,
  `phone` CHAR(10) NOT NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `notified_at` DATETIME NULL,
  CONSTRAINT `chk_req_units` CHECK (`units_needed` BETWEEN 1 AND 10),
  CONSTRAINT `chk_req_phone` CHECK (`phone` REGEXP '^[0-9]{10}$'),
  CONSTRAINT `fk_req_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals`(`id`) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT `fk_req_city` FOREIGN KEY (`city`) REFERENCES `cities`(`name`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_req_group` FOREIGN KEY (`blood_group`) REFERENCES `blood_groups`(`code`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Junction: Donors notified for a request
CREATE TABLE `request_notified` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `request_id` VARCHAR(36) NOT NULL,
  `donor_id` VARCHAR(36) NOT NULL,
  `notified_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `distance_km` DECIMAL(6,2) NULL,
  CONSTRAINT `fk_rn_request` FOREIGN KEY (`request_id`) REFERENCES `requests`(`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_rn_donor` FOREIGN KEY (`donor_id`) REFERENCES `donors`(`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  UNIQUE KEY `uq_rn_req_donor` (`request_id`, `donor_id`)
) ENGINE=InnoDB;

-- Junction: Donor accepted request (Hospital can now view donor phone)
CREATE TABLE `request_accepted` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `request_id` VARCHAR(36) NOT NULL,
  `donor_id` VARCHAR(36) NOT NULL,
  `accepted_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_ra_request` FOREIGN KEY (`request_id`) REFERENCES `requests`(`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_ra_donor` FOREIGN KEY (`donor_id`) REFERENCES `donors`(`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  UNIQUE KEY `uq_ra_req_donor` (`request_id`, `donor_id`)
) ENGINE=InnoDB;

-- Junction: Donor declined request
CREATE TABLE `request_declined` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `request_id` VARCHAR(36) NOT NULL,
  `donor_id` VARCHAR(36) NOT NULL,
  `declined_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_rd_request` FOREIGN KEY (`request_id`) REFERENCES `requests`(`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_rd_donor` FOREIGN KEY (`donor_id`) REFERENCES `donors`(`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  UNIQUE KEY `uq_rd_req_donor` (`request_id`, `donor_id`)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 5. BLOOD DONATION CAMPS
-- ----------------------------------------------------------------------------

CREATE TABLE `camps` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `name` VARCHAR(200) NOT NULL,
  `organizer_hospital_id` VARCHAR(36) NULL,
  `city` VARCHAR(50) NOT NULL,
  `date` DATE NOT NULL,
  `address` TEXT NOT NULL,
  `target_units` INT UNSIGNED NOT NULL DEFAULT 50,
  `collected_units` INT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_camp_hospital` FOREIGN KEY (`organizer_hospital_id`) REFERENCES `hospitals`(`id`) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT `fk_camp_city` FOREIGN KEY (`city`) REFERENCES `cities`(`name`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE `camp_registrations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `camp_id` VARCHAR(36) NOT NULL,
  `donor_id` VARCHAR(36) NOT NULL,
  `registered_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `time_slot` VARCHAR(25) NOT NULL DEFAULT '10:00 AM - 12:00 PM',
  CONSTRAINT `fk_cr_camp` FOREIGN KEY (`camp_id`) REFERENCES `camps`(`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_cr_donor` FOREIGN KEY (`donor_id`) REFERENCES `donors`(`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  UNIQUE KEY `uq_cr_camp_donor` (`camp_id`, `donor_id`)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 6. INTER-HOSPITAL STOCK TRANSFERS
-- ----------------------------------------------------------------------------

CREATE TABLE `transfers` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `source_hospital_id` VARCHAR(36) NOT NULL,
  `dest_hospital_id` VARCHAR(36) NOT NULL,
  `unit_id` VARCHAR(36) NOT NULL,
  `status` ENUM('REQUESTED', 'IN_TRANSIT', 'COMPLETED', 'REJECTED') NOT NULL DEFAULT 'REQUESTED',
  `requested_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` DATETIME NULL,
  `notes` TEXT NULL,
  CONSTRAINT `fk_tf_source` FOREIGN KEY (`source_hospital_id`) REFERENCES `hospitals`(`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_tf_dest` FOREIGN KEY (`dest_hospital_id`) REFERENCES `hospitals`(`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_tf_unit` FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 7. AUDIT TRAIL LOG
-- ----------------------------------------------------------------------------

CREATE TABLE `audit_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `entity` VARCHAR(50) NOT NULL,
  `entity_id` VARCHAR(36) NOT NULL,
  `action` VARCHAR(40) NOT NULL,
  `performed_by` VARCHAR(36) NULL,
  `role` ENUM('admin', 'donor', 'hospital', 'system') NULL,
  `detail` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_audit_entity` (`entity`, `entity_id`),
  INDEX `idx_audit_user` (`performed_by`)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 8. PERFORMANCE INDEXES
-- ----------------------------------------------------------------------------

-- Index for Smart Matching Query: Filter available donors by city & group
CREATE INDEX `idx_donor_match` ON `donors` (`city`, `blood_group`, `available`, `active`);

-- Index for Inventory Lookup: Check hospital stock by blood group and expiry
CREATE INDEX `idx_unit_stock` ON `units` (`hospital_id`, `blood_group`, `status`, `expiry`);

-- Index for Emergency Requests: Filter open requests by urgency & city
CREATE INDEX `idx_request_urgency` ON `requests` (`status`, `urgency`, `city`);

-- Index for Donation History: Order donor's donations chronologically
CREATE INDEX `idx_donation_history` ON `donations` (`donor_id`, `collected_at`);
