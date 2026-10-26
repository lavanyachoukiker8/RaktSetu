-- ============================================================================
-- RaktSetu – Reference Data Script
-- Populates immutable lookup tables (Blood groups, Cities with Geo-coords, Roles)
-- ============================================================================

USE `blood_donor_db`;

-- 1. Standard ABO & Rh Blood Groups (with Rare group flags)
INSERT INTO `blood_groups` (`code`, `description`, `is_rare`) VALUES
  ('O-',  'O Negative (Universal)', TRUE),
  ('O+',  'O Positive',            FALSE),
  ('A-',  'A Negative',            TRUE),
  ('A+',  'A Positive',            FALSE),
  ('B-',  'B Negative',            TRUE),
  ('B+',  'B Positive',            FALSE),
  ('AB-', 'AB Negative (Rare)',    TRUE),
  ('AB+', 'AB Positive (Recipient)', FALSE)
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`), `is_rare` = VALUES(`is_rare`);

-- 2. Major Cities with Coordinates (for proximity & distance calculations)
INSERT INTO `cities` (`name`, `state`, `latitude`, `longitude`) VALUES
  ('Surat',     'Gujarat',     21.170240, 72.831062),
  ('Ahmedabad', 'Gujarat',     23.022505, 72.571362),
  ('Vadodara',  'Gujarat',     22.307159, 73.181219),
  ('Mumbai',    'Maharashtra', 19.076090, 72.877426),
  ('Pune',      'Maharashtra', 18.520430, 73.856744)
ON DUPLICATE KEY UPDATE `state` = VALUES(`state`), `latitude` = VALUES(`latitude`), `longitude` = VALUES(`longitude`);

-- 3. System Roles
INSERT INTO `roles` (`id`, `name`) VALUES
  (1, 'admin'),
  (2, 'donor'),
  (3, 'hospital')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);
