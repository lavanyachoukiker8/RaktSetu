-- RaktSetu – Phase 3A MySQL Schema (implementation)
-- ------------------------------------------------------------
-- 1. Lookup tables (immutable reference data)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `blood_groups` (
  `code` VARCHAR(3) NOT NULL PRIMARY KEY,
  `description` VARCHAR(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `cities` (
  `name` VARCHAR(50) NOT NULL PRIMARY KEY
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `roles` (
  `id` TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  `name` ENUM('admin','donor','hospital') NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 2. Core authentication / identity tables
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(100) NOT NULL UNIQUE,
  `email` VARCHAR(150),
  `phone` CHAR(10) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role_id` TINYINT UNSIGNED NOT NULL,
  `donor_id` VARCHAR(36) NULL,
  `hospital_id` VARCHAR(36) NULL,
  CONSTRAINT `fk_user_role` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_user_donor` FOREIGN KEY (`donor_id`) REFERENCES `donors`(`id`) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT `fk_user_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals`(`id`) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 3. Domain tables
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `donors` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `gender` ENUM('Male','Female','Other') NOT NULL,
  `dob` DATE NOT NULL,
  `phone` CHAR(10) NOT NULL UNIQUE,
  `email` VARCHAR(150),
  `blood_group` VARCHAR(3) NOT NULL,
  `city` VARCHAR(50) NOT NULL,
  `area` VARCHAR(150),
  `pincode` VARCHAR(10),
  `weight_kg` DECIMAL(5,2) DEFAULT 0,
  `available` BOOLEAN NOT NULL DEFAULT TRUE,
  `active` BOOLEAN NOT NULL DEFAULT TRUE,
  `preferred_time` VARCHAR(20) NOT NULL DEFAULT 'Anytime',
  `last_donation` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `chk_phone_digits` CHECK (phone REGEXP '^[0-9]{10}$'),
  CONSTRAINT `chk_age` CHECK (TIMESTAMPDIFF(YEAR, dob, CURDATE()) BETWEEN 18 AND 65),
  CONSTRAINT `fk_donor_group` FOREIGN KEY (`blood_group`) REFERENCES `blood_groups`(`code`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_donor_city` FOREIGN KEY (`city`) REFERENCES `cities`(`name`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `hospitals` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `name` VARCHAR(200) NOT NULL,
  `city` VARCHAR(50) NOT NULL,
  `address` TEXT NOT NULL,
  `status` ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  `license` VARCHAR(100) NOT NULL,
  `phone` CHAR(10) NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `contact_person` VARCHAR(150) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `stock_updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_hospital_city` FOREIGN KEY (`city`) REFERENCES `cities`(`name`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `chk_hospital_phone` CHECK (phone REGEXP '^[0-9]{10}$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `inventory_thresholds` (
  `hospital_id` VARCHAR(36) NOT NULL,
  `blood_group` VARCHAR(3) NOT NULL,
  `threshold` INT UNSIGNED NOT NULL DEFAULT 8,
  PRIMARY KEY (`hospital_id`,`blood_group`),
  CONSTRAINT `fk_thresh_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals`(`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_thresh_group` FOREIGN KEY (`blood_group`) REFERENCES `blood_groups`(`code`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `chk_threshold_range` CHECK (threshold >= 0 AND threshold <= 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `units` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `hospital_id` VARCHAR(36) NOT NULL,
  `blood_group` VARCHAR(3) NOT NULL,
  `collected_at` DATETIME NOT NULL,
  `expiry` DATETIME NOT NULL,
  `status` ENUM('AVAILABLE','RESERVED','USED','EXPIRED','DISCARDED') NOT NULL DEFAULT 'AVAILABLE',
  CONSTRAINT `fk_unit_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals`(`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_unit_group` FOREIGN KEY (`blood_group`) REFERENCES `blood_groups`(`code`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `chk_expiry_future` CHECK (`expiry` > `collected_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `donations` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `donor_id` VARCHAR(36) NOT NULL,
  `hospital_id` VARCHAR(36) NOT NULL,
  `units` INT UNSIGNED NOT NULL,
  `collected_at` DATETIME NOT NULL,
  `status` ENUM('PENDING','COMPLETED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  CONSTRAINT `fk_donation_donor` FOREIGN KEY (`donor_id`) REFERENCES `donors`(`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_donation_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals`(`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `chk_donation_units` CHECK (units > 0 AND units <= 10)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `requests` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `hospital_id` VARCHAR(36) NULL,
  `hospital_name` VARCHAR(200) NOT NULL,
  `city` VARCHAR(50) NOT NULL,
  `patient_name` VARCHAR(150) NOT NULL,
  `blood_group` VARCHAR(3) NOT NULL,
  `units_needed` INT UNSIGNED NOT NULL,
  `urgency` ENUM('NORMAL','URGENT','CRITICAL') NOT NULL DEFAULT 'NORMAL',
  `status` ENUM('OPEN','PARTIAL','FULFILLED','CANCELLED') NOT NULL DEFAULT 'OPEN',
  `required_by` DATETIME NOT NULL,
  `contact_person` VARCHAR(150) NOT NULL,
  `phone` CHAR(10) NOT NULL,
  `notes` TEXT,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `notified_at` DATETIME NULL,
  CONSTRAINT `fk_req_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals`(`id`) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT `fk_req_city` FOREIGN KEY (`city`) REFERENCES `cities`(`name`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_req_group` FOREIGN KEY (`blood_group`) REFERENCES `blood_groups`(`code`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `chk_req_units` CHECK (`units_needed` BETWEEN 1 AND 10),
  CONSTRAINT `chk_req_phone` CHECK (`phone` REGEXP '^[0-9]{10}$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Junction tables for request‑donor interactions
CREATE TABLE IF NOT EXISTS `request_notified` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `request_id` VARCHAR(36) NOT NULL,
  `donor_id` VARCHAR(36) NOT NULL,
  `notified_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_rn_request` FOREIGN KEY (`request_id`) REFERENCES `requests`(`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_rn_donor` FOREIGN KEY (`donor_id`) REFERENCES `donors`(`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
  UNIQUE KEY `uq_rn_req_donor` (`request_id`,`donor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `request_accepted` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `request_id` VARCHAR(36) NOT NULL,
  `donor_id` VARCHAR(36) NOT NULL,
  `accepted_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_ra_request` FOREIGN KEY (`request_id`) REFERENCES `requests`(`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_ra_donor` FOREIGN KEY (`donor_id`) REFERENCES `donors`(`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
  UNIQUE KEY `uq_ra_req_donor` (`request_id`,`donor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `request_declined` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `request_id` VARCHAR(36) NOT NULL,
  `donor_id` VARCHAR(36) NOT NULL,
  `declined_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_rd_request` FOREIGN KEY (`request_id`) REFERENCES `requests`(`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_rd_donor` FOREIGN KEY (`donor_id`) REFERENCES `donors`(`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
  UNIQUE KEY `uq_rd_req_donor` (`request_id`,`donor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 4. Camps & registrations
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `camps` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `name` VARCHAR(200) NOT NULL,
  `city` VARCHAR(50) NOT NULL,
  `date` DATE NOT NULL,
  `address` TEXT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_camp_city` FOREIGN KEY (`city`) REFERENCES `cities`(`name`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `camp_registrations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `camp_id` VARCHAR(36) NOT NULL,
  `donor_id` VARCHAR(36) NOT NULL,
  `registered_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_cr_camp` FOREIGN KEY (`camp_id`) REFERENCES `camps`(`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_cr_donor` FOREIGN KEY (`donor_id`) REFERENCES `donors`(`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
  UNIQUE KEY `uq_cr_camp_donor` (`camp_id`,`donor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 5. Inter‑hospital transfers
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `transfers` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `source_hospital_id` VARCHAR(36) NOT NULL,
  `dest_hospital_id` VARCHAR(36) NOT NULL,
  `unit_id` VARCHAR(36) NOT NULL,
  `status` ENUM('REQUESTED','COMPLETED','REJECTED') NOT NULL DEFAULT 'REQUESTED',
  `requested_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` DATETIME NULL,
  CONSTRAINT `fk_tf_source` FOREIGN KEY (`source_hospital_id`) REFERENCES `hospitals`(`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_tf_dest` FOREIGN KEY (`dest_hospital_id`) REFERENCES `hospitals`(`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_tf_unit` FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
  UNIQUE KEY `uq_transfer_unit` (`unit_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 6. Audit log (minimal, no PII in detail)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `entity` VARCHAR(50) NOT NULL,
  `entity_id` VARCHAR(36) NOT NULL,
  `action` VARCHAR(30) NOT NULL,
  `performed_by` VARCHAR(36) NULL,
  `role` ENUM('admin','donor','hospital') NULL,
  `detail` TEXT,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_audit_entity` (`entity`,`entity_id`),
  INDEX `idx_audit_user` (`performed_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 7. Indexes for frequently queried columns
-- ------------------------------------------------------------
CREATE INDEX idx_donor_city_group ON `donors`(`city`,`blood_group`);
CREATE INDEX idx_unit_hospital_group_status ON `units`(`hospital_id`,`blood_group`,`status`);
CREATE INDEX idx_request_city_status ON `requests`(`city`,`status`);
CREATE INDEX idx_transfer_status ON `transfers`(`status`);

-- ------------------------------------------------------------
-- 8. Notes on business‑rule enforcement (Phase 3B)
-- ------------------------------------------------------------
/*
   • Minimum 90‑day donation gap – enforced by backend logic / stored procedures (Phase 3B).
   • Badge thresholds – derived from COUNT(*) on `donations`.
   • Low‑stock definition – view joining `units` (available) with `inventory_thresholds`.
   • Phone numbers – CHECK constraints ensure 10‑digit format.
   • Age – CHECK on DOB ensures 18‑65 at insert time.
*/
