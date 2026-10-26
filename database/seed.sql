-- ============================================================================
-- RaktSetu – Comprehensive Seed Data Script
-- Course: CS203 DBMS | SVNIT Surat
-- Seeds realistic donors (Surat, Ahmedabad, etc.), hospitals, inventory bags,
-- thresholds, emergency requests, camps, and audit entries.
-- ============================================================================

USE `blood_donor_db`;

-- Disable FK checks temporarily for bulk load
SET FOREIGN_KEY_CHECKS = 0;

-- Clean tables
TRUNCATE TABLE `audit_logs`;
TRUNCATE TABLE `transfers`;
TRUNCATE TABLE `camp_registrations`;
TRUNCATE TABLE `camps`;
TRUNCATE TABLE `request_declined`;
TRUNCATE TABLE `request_accepted`;
TRUNCATE TABLE `request_notified`;
TRUNCATE TABLE `requests`;
TRUNCATE TABLE `donations`;
TRUNCATE TABLE `units`;
TRUNCATE TABLE `inventory_thresholds`;
TRUNCATE TABLE `users`;
TRUNCATE TABLE `donors`;
TRUNCATE TABLE `hospitals`;

SET FOREIGN_KEY_CHECKS = 1;

-- ----------------------------------------------------------------------------
-- 1. HOSPITALS & BLOOD BANKS
-- ----------------------------------------------------------------------------
INSERT INTO `hospitals` (`id`, `name`, `city`, `address`, `status`, `license`, `phone`, `email`, `contact_person`, `created_at`) VALUES
('hosp-01', 'Civil Hospital & Blood Bank', 'Surat', 'Majura Gate, Ring Road, Surat', 'APPROVED', 'LIC-GUJ-SRT-2021-001', '9825100001', 'bloodbank@civilsurat.gov.in', 'Dr. Ramesh Trivedi', '2026-01-10 09:00:00'),
('hosp-02', 'Lifeline Multispeciality Hospital', 'Surat', 'Ring Road, Athwa Lines, Surat', 'APPROVED', 'LIC-GUJ-SRT-2022-045', '9825100002', 'contact@lifelinesurat.com', 'Dr. Sneha Parikh', '2026-02-15 10:30:00'),
('hosp-03', 'Sunshine Global Hospital', 'Surat', 'Dumas Road, Piplod, Surat', 'APPROVED', 'LIC-GUJ-SRT-2023-112', '9825100003', 'emergency@sunshinesurat.org', 'Dr. Alok Verma', '2026-03-20 11:00:00'),
('hosp-04', 'SVP Institute of Medical Sciences', 'Ahmedabad', 'Ellisbridge, Ahmedabad', 'APPROVED', 'LIC-GUJ-AMD-2020-008', '9879100004', 'bloodbank@svphospital.com', 'Dr. Mayank Shah', '2026-01-05 08:30:00'),
('hosp-05', 'Sterling Hospital Blood Centre', 'Vadodara', 'Race Course Circle, Vadodara', 'APPROVED', 'LIC-GUJ-BRD-2022-099', '9898100005', 'blood@sterlingvadodara.com', 'Dr. Bhavesh Patel', '2026-04-12 14:00:00'),
('hosp-06', 'Andheri Hope Hospital', 'Mumbai', 'S.V. Road, Andheri West, Mumbai', 'PENDING', 'LIC-MAH-MUM-2026-441', '9820100006', 'admin@andherihope.org', 'Dr. Rita Dsouza', '2026-10-20 16:45:00');

-- ----------------------------------------------------------------------------
-- 2. REGISTERED DONORS
-- ----------------------------------------------------------------------------
INSERT INTO `donors` (`id`, `name`, `gender`, `dob`, `phone`, `email`, `blood_group`, `city`, `area`, `pincode`, `weight_kg`, `available`, `active`, `preferred_time`, `last_donation`, `next_eligible_date`, `donation_count`) VALUES
-- Surat Donors
('donor-01', 'Aarav Patel', 'Male', '1998-05-14', '9876543210', 'aarav.patel@gmail.com', 'O+', 'Surat', 'Athwa', '395001', 68.5, TRUE, TRUE, 'Morning (9am - 12pm)', '2026-03-10 10:00:00', '2026-06-08', 3),
('donor-02', 'Priya Shah', 'Female', '2001-08-22', '9876543211', 'priya.shah@gmail.com', 'A+', 'Surat', 'Vesu', '395007', 56.0, TRUE, TRUE, 'Evening (5pm - 8pm)', '2026-06-20 11:30:00', '2026-09-18', 1),
('donor-03', 'Rohan Mehta', 'Male', '1995-12-03', '9876543212', 'rohan.mehta@yahoo.com', 'B+', 'Surat', 'Adajan', '395009', 74.0, TRUE, TRUE, 'Anytime', '2026-01-15 09:15:00', '2026-04-15', 5),
('donor-04', 'Ananya Desai', 'Female', '2000-02-19', '9876543213', 'ananya.desai@outlook.com', 'AB-', 'Surat', 'Piplod', '395007', 54.5, TRUE, TRUE, 'Afternoon (1pm - 4pm)', '2026-04-18 14:00:00', '2026-07-17', 3),
('donor-05', 'Vikram Joshi', 'Male', '1990-11-28', '9876543214', 'vikram.j@gmail.com', 'O-', 'Surat', 'Rander', '395005', 79.0, TRUE, TRUE, 'Morning (9am - 12pm)', '2025-11-20 10:45:00', '2026-02-18', 11),
('donor-06', 'Neha Sharma', 'Female', '1999-07-09', '9876543215', 'neha.sharma@gmail.com', 'A-', 'Surat', 'Varachha', '395006', 52.0, TRUE, TRUE, 'Anytime', '2026-06-25 15:30:00', '2026-09-23', 5),
('donor-07', 'Jayraj Chauhan', 'Male', '2003-04-17', '9876543216', 'jayraj.c@gmail.com', 'B+', 'Surat', 'Ichchhanath', '395007', 65.0, TRUE, TRUE, 'Evening (5pm - 8pm)', NULL, NULL, 1),
('donor-08', 'Tanisha Vasa', 'Female', '2004-09-12', '9876543217', 'tanisha.vasa@svnit.ac.in', 'O+', 'Surat', 'SVNIT Campus', '395007', 53.0, TRUE, TRUE, 'Anytime', '2026-02-10 11:00:00', '2026-05-11', 2),
('donor-09', 'Lavanya Choukiker', 'Female', '2004-03-04', '9876543218', 'lavanya.c@svnit.ac.in', 'A+', 'Surat', 'SVNIT Campus', '395007', 54.0, TRUE, TRUE, 'Anytime', '2026-06-01 10:00:00', '2026-08-30', 4),
('donor-10', 'Om Chauhan', 'Male', '2003-10-25', '9876543219', 'om.chauhan@svnit.ac.in', 'B+', 'Surat', 'SVNIT Campus', '395007', 67.0, TRUE, TRUE, 'Morning (9am - 12pm)', '2026-01-05 12:00:00', '2026-04-05', 4),

-- Ahmedabad Donors
('donor-11', 'Kunal Trivedi', 'Male', '1996-01-30', '9876543220', 'kunal.t@gmail.com', 'B-', 'Ahmedabad', 'Navrangpura', '380009', 70.0, TRUE, TRUE, 'Anytime', '2026-05-15 10:00:00', '2026-08-13', 2),
('donor-12', 'Pooja Bhatt', 'Female', '1998-10-14', '9876543221', 'pooja.b@yahoo.com', 'AB+', 'Ahmedabad', 'Satellite', '380015', 58.0, TRUE, TRUE, 'Evening (5pm - 8pm)', '2026-06-10 16:00:00', '2026-09-08', 3),
('donor-13', 'Hardik Pandya', 'Male', '1993-06-11', '9876543222', 'hardik.p@gmail.com', 'O+', 'Ahmedabad', 'Bodakdev', '380054', 82.0, TRUE, TRUE, 'Anytime', '2026-03-15 09:30:00', '2026-06-13', 7),
('donor-14', 'Kavita Dave', 'Female', '2002-04-05', '9876543223', 'kavita.d@gmail.com', 'A+', 'Ahmedabad', 'Maninagar', '380008', 51.0, FALSE, TRUE, 'Morning (9am - 12pm)', '2026-07-01 11:15:00', '2026-09-29', 1),

-- Vadodara Donors
('donor-15', 'Chirag Solanki', 'Male', '1997-09-18', '9876543224', 'chirag.s@gmail.com', 'O-', 'Vadodara', 'Alkapuri', '390007', 71.5, TRUE, TRUE, 'Anytime', '2026-04-20 10:00:00', '2026-07-19', 4),
('donor-16', 'Ritu Vaghela', 'Female', '2001-11-03', '9876543225', 'ritu.v@gmail.com', 'B+', 'Vadodara', 'Fatehgunj', '390002', 55.0, TRUE, TRUE, 'Evening (5pm - 8pm)', '2026-06-18 15:45:00', '2026-09-16', 3),

-- Mumbai Donors
('donor-17', 'Aditya Kulkarni', 'Male', '1994-08-25', '9876543226', 'aditya.k@gmail.com', 'A-', 'Mumbai', 'Bandra', '400050', 73.0, TRUE, TRUE, 'Anytime', '2026-05-05 10:00:00', '2026-08-03', 8),
('donor-18', 'Simran Kaur', 'Female', '2000-12-14', '9876543227', 'simran.k@gmail.com', 'B+', 'Mumbai', 'Andheri', '400053', 59.0, TRUE, TRUE, 'Morning (9am - 12pm)', '2026-06-22 11:30:00', '2026-09-20', 2),

-- Pune Donors
('donor-19', 'Gaurav Deshmukh', 'Male', '1992-03-31', '9876543228', 'gaurav.d@gmail.com', 'O+', 'Pune', 'Kothrud', '411038', 76.0, TRUE, TRUE, 'Anytime', '2026-04-14 09:00:00', '2026-07-13', 10),
('donor-20', 'Tanvi Shinde', 'Female', '2003-01-20', '9876543229', 'tanvi.s@gmail.com', 'AB-', 'Pune', 'Viman Nagar', '411014', 53.5, TRUE, TRUE, 'Evening (5pm - 8pm)', '2026-07-10 16:30:00', '2026-10-08', 3);

-- ----------------------------------------------------------------------------
-- 3. USERS (With pre-computed bcrypt hashes for demo logins)
-- Passwords:
--   admin123    -> $2b$10$0jTG18ZI8bRxhvxE/DRLBuUEU9QHlLbmw2BwYbWOZRry6oPCcfQB2
--   donor123    -> $2b$10$IBYr4ub/ihkS1CrWRWrecObRYc9di3H/i4.UU9qyz5sbqH5ysWsv2
--   hospital123 -> $2b$10$j3hOnmI.mEZBeBNXdGMX8u7NB9garYm/qyQbNXhKxBv3gKJJL5SjC
-- ----------------------------------------------------------------------------
INSERT INTO `users` (`id`, `username`, `email`, `phone`, `password_hash`, `role_id`, `donor_id`, `hospital_id`) VALUES
(1, 'admin', 'admin@raktsetu.org', '9000000001', '$2b$10$0jTG18ZI8bRxhvxE/DRLBuUEU9QHlLbmw2BwYbWOZRry6oPCcfQB2', 1, NULL, NULL),
(2, 'donor', 'aarav.patel@gmail.com', '9876543210', '$2b$10$IBYr4ub/ihkS1CrWRWrecObRYc9di3H/i4.UU9qyz5sbqH5ysWsv2', 2, 'donor-01', NULL),
(3, 'donor2', 'priya.shah@gmail.com', '9876543211', '$2b$10$IBYr4ub/ihkS1CrWRWrecObRYc9di3H/i4.UU9qyz5sbqH5ysWsv2', 2, 'donor-02', NULL),
(4, 'hospital', 'bloodbank@civilsurat.gov.in', '9825100001', '$2b$10$j3hOnmI.mEZBeBNXdGMX8u7NB9garYm/qyQbNXhKxBv3gKJJL5SjC', 3, NULL, 'hosp-01'),
(5, 'hospital2', 'contact@lifelinesurat.com', '9825100002', '$2b$10$j3hOnmI.mEZBeBNXdGMX8u7NB9garYm/qyQbNXhKxBv3gKJJL5SjC', 3, NULL, 'hosp-02');

-- ----------------------------------------------------------------------------
-- 4. INVENTORY THRESHOLDS
-- ----------------------------------------------------------------------------
INSERT INTO `inventory_thresholds` (`hospital_id`, `blood_group`, `threshold`) VALUES
('hosp-01', 'A+', 8), ('hosp-01', 'A-', 4), ('hosp-01', 'B+', 10), ('hosp-01', 'B-', 4),
('hosp-01', 'AB+', 6), ('hosp-01', 'AB-', 3), ('hosp-01', 'O+', 12), ('hosp-01', 'O-', 5),
('hosp-02', 'A+', 6), ('hosp-02', 'A-', 3), ('hosp-02', 'B+', 8), ('hosp-02', 'B-', 3),
('hosp-02', 'AB+', 5), ('hosp-02', 'AB-', 2), ('hosp-02', 'O+', 10), ('hosp-02', 'O-', 4);

-- ----------------------------------------------------------------------------
-- 5. BLOOD UNIT BAGS (Unit-level barcode & expiry tracking)
-- ----------------------------------------------------------------------------
INSERT INTO `units` (`id`, `bag_barcode`, `hospital_id`, `blood_group`, `component`, `collected_at`, `expiry`, `status`) VALUES
-- Surat Civil Hospital Units
('unit-01', 'BAG-20261001-SRT-01', 'hosp-01', 'A+', 'WHOLE_BLOOD', '2026-10-01 10:00:00', '2026-11-12 10:00:00', 'AVAILABLE'),
('unit-02', 'BAG-20261002-SRT-02', 'hosp-01', 'A+', 'WHOLE_BLOOD', '2026-10-02 11:30:00', '2026-11-13 11:30:00', 'AVAILABLE'),
('unit-03', 'BAG-20260920-SRT-03', 'hosp-01', 'A-', 'RBC',         '2026-09-20 09:00:00', '2026-11-01 09:00:00', 'AVAILABLE'),
('unit-04', 'BAG-20261010-SRT-04', 'hosp-01', 'B+', 'WHOLE_BLOOD', '2026-10-10 14:00:00', '2026-11-21 14:00:00', 'AVAILABLE'),
('unit-05', 'BAG-20261011-SRT-05', 'hosp-01', 'B+', 'WHOLE_BLOOD', '2026-10-11 15:30:00', '2026-11-22 15:30:00', 'AVAILABLE'),
('unit-06', 'BAG-20261012-SRT-06', 'hosp-01', 'B+', 'PLATELETS',   '2026-10-23 10:00:00', '2026-10-28 10:00:00', 'AVAILABLE'),
('unit-07', 'BAG-20261005-SRT-07', 'hosp-01', 'O+', 'WHOLE_BLOOD', '2026-10-05 09:30:00', '2026-11-16 09:30:00', 'AVAILABLE'),
('unit-08', 'BAG-20261006-SRT-08', 'hosp-01', 'O+', 'WHOLE_BLOOD', '2026-10-06 12:00:00', '2026-11-17 12:00:00', 'AVAILABLE'),
('unit-09', 'BAG-20261007-SRT-09', 'hosp-01', 'O+', 'RBC',         '2026-10-07 16:20:00', '2026-11-18 16:20:00', 'AVAILABLE'),
('unit-10', 'BAG-20261015-SRT-10', 'hosp-01', 'O-', 'WHOLE_BLOOD', '2026-10-15 11:00:00', '2026-11-26 11:00:00', 'AVAILABLE'),
('unit-11', 'BAG-20261018-SRT-11', 'hosp-01', 'AB+', 'PLASMA',     '2026-10-18 10:00:00', '2027-10-18 10:00:00', 'AVAILABLE'),
('unit-12', 'BAG-20260901-SRT-12', 'hosp-01', 'B+', 'WHOLE_BLOOD', '2026-09-01 10:00:00', '2026-10-13 10:00:00', 'EXPIRED'),

-- Lifeline Hospital Units
('unit-13', 'BAG-20261008-LIF-01', 'hosp-02', 'B+', 'WHOLE_BLOOD', '2026-10-08 10:15:00', '2026-11-19 10:15:00', 'AVAILABLE'),
('unit-14', 'BAG-20261009-LIF-02', 'hosp-02', 'B+', 'WHOLE_BLOOD', '2026-10-09 11:45:00', '2026-11-20 11:45:00', 'AVAILABLE'),
('unit-15', 'BAG-20261014-LIF-03', 'hosp-02', 'O+', 'WHOLE_BLOOD', '2026-10-14 14:00:00', '2026-11-25 14:00:00', 'AVAILABLE'),
('unit-16', 'BAG-20261016-LIF-04', 'hosp-02', 'A+', 'WHOLE_BLOOD', '2026-10-16 09:30:00', '2026-11-27 09:30:00', 'AVAILABLE'),
('unit-17', 'BAG-20261017-LIF-05', 'hosp-02', 'AB-', 'WHOLE_BLOOD', '2026-10-17 15:00:00', '2026-11-28 15:00:00', 'AVAILABLE');

-- ----------------------------------------------------------------------------
-- 6. DONATION RECORDS (With verified certificates)
-- ----------------------------------------------------------------------------
INSERT INTO `donations` (`id`, `donor_id`, `hospital_id`, `units`, `collected_at`, `status`, `certificate_id`) VALUES
('don-01', 'donor-01', 'hosp-01', 1, '2026-06-15 10:00:00', 'COMPLETED', 'CERT-2026-SRT-00412'),
('don-02', 'donor-03', 'hosp-02', 1, '2026-05-10 09:15:00', 'COMPLETED', 'CERT-2026-SRT-00388'),
('don-03', 'donor-05', 'hosp-01', 1, '2026-03-01 10:45:00', 'COMPLETED', 'CERT-2026-SRT-00192'),
('don-04', 'donor-08', 'hosp-01', 1, '2026-05-20 11:00:00', 'COMPLETED', 'CERT-2026-SRT-00395'),
('don-05', 'donor-10', 'hosp-02', 1, '2026-04-10 12:00:00', 'COMPLETED', 'CERT-2026-SRT-00277'),
('don-06', 'donor-02', 'hosp-01', 1, '2026-10-05 11:30:00', 'COMPLETED', 'CERT-2026-SRT-00512');

-- ----------------------------------------------------------------------------
-- 7. EMERGENCY REQUESTS
-- ----------------------------------------------------------------------------
INSERT INTO `requests` (`id`, `hospital_id`, `hospital_name`, `city`, `patient_name`, `blood_group`, `units_needed`, `urgency`, `status`, `required_by`, `contact_person`, `phone`, `notes`, `created_at`) VALUES
('req-01', 'hosp-02', 'Lifeline Multispeciality Hospital', 'Surat', 'Rajesh K. Verma', 'B+', 2, 'CRITICAL', 'OPEN', DATE_ADD(NOW(), INTERVAL 4 HOUR), 'Dr. Sneha Parikh', '9825100002', 'Accident emergency in ICU. Immediate transfusion needed.', NOW() - INTERVAL 30 MINUTE),
('req-02', 'hosp-01', 'Civil Hospital & Blood Bank', 'Surat', 'Meena Ben Patel', 'O-', 1, 'URGENT', 'OPEN', DATE_ADD(NOW(), INTERVAL 8 HOUR), 'Dr. Ramesh Trivedi', '9825100001', 'Thalassemia patient regular transfusion.', NOW() - INTERVAL 2 HOUR),
('req-03', 'hosp-03', 'Sunshine Global Hospital', 'Surat', 'Baby of Sunita', 'AB+', 1, 'NORMAL', 'PARTIAL', DATE_ADD(NOW(), INTERVAL 24 HOUR), 'Dr. Alok Verma', '9825100003', 'Pediatric surgery scheduled.', NOW() - INTERVAL 12 HOUR),
('req-04', 'hosp-04', 'SVP Institute of Medical Sciences', 'Ahmedabad', 'Dhaval Shah', 'A+', 2, 'NORMAL', 'FULFILLED', NOW() - INTERVAL 1 DAY, 'Dr. Mayank Shah', '9879100004', 'Cardiothoracic bypass graft completed.', NOW() - INTERVAL 2 DAY);

-- Notification & Acceptance links for req-01
INSERT INTO `request_notified` (`request_id`, `donor_id`, `notified_at`, `distance_km`) VALUES
('req-01', 'donor-03', NOW() - INTERVAL 25 MINUTE, 4.2),
('req-01', 'donor-07', NOW() - INTERVAL 25 MINUTE, 2.8),
('req-01', 'donor-10', NOW() - INTERVAL 25 MINUTE, 3.5),
('req-01', 'donor-05', NOW() - INTERVAL 25 MINUTE, 6.1);

INSERT INTO `request_accepted` (`request_id`, `donor_id`, `accepted_at`) VALUES
('req-01', 'donor-03', NOW() - INTERVAL 15 MINUTE);

-- ----------------------------------------------------------------------------
-- 8. BLOOD CAMPS & REGISTRATIONS
-- ----------------------------------------------------------------------------
INSERT INTO `camps` (`id`, `name`, `organizer_hospital_id`, `city`, `date`, `address`, `target_units`, `collected_units`, `created_at`) VALUES
('camp-01', 'SVNIT Youth Blood Donation Drive', 'hosp-01', 'Surat', DATE_ADD(CURRENT_DATE, INTERVAL 4 DAY), 'Student Activity Centre (SAC), SVNIT Campus, Ichchhanath, Surat', 150, 0, NOW() - INTERVAL 5 DAY),
('camp-02', 'Adajan Community Life Savers Camp', 'hosp-02', 'Surat', DATE_ADD(CURRENT_DATE, INTERVAL 10 DAY), 'Community Hall, Prime Arcade, Anand Mahal Road, Adajan, Surat', 80, 0, NOW() - INTERVAL 3 DAY),
('camp-03', 'E-Cell SVNIT Annual Mega Drive', 'hosp-01', 'Surat', CURRENT_DATE - INTERVAL 45 DAY, 'Main Seminar Hall, CSE Dept, SVNIT, Surat', 120, 114, NOW() - INTERVAL 50 DAY);

INSERT INTO `camp_registrations` (`camp_id`, `donor_id`, `registered_at`, `time_slot`) VALUES
('camp-01', 'donor-01', NOW() - INTERVAL 2 DAY, '10:00 AM - 11:00 AM'),
('camp-01', 'donor-07', NOW() - INTERVAL 1 DAY, '11:00 AM - 12:00 PM'),
('camp-01', 'donor-08', NOW() - INTERVAL 1 DAY, '02:00 PM - 03:00 PM');

-- ----------------------------------------------------------------------------
-- 9. AUDIT LOG INITIALIZATION
-- ----------------------------------------------------------------------------
INSERT INTO `audit_logs` (`entity`, `entity_id`, `action`, `performed_by`, `role`, `detail`, `created_at`) VALUES
('hospitals', 'hosp-01', 'HOSPITAL_APPROVED', 'system_admin', 'admin', 'Civil Hospital Surat approved by Admin', '2026-01-10 09:30:00'),
('hospitals', 'hosp-02', 'HOSPITAL_APPROVED', 'system_admin', 'admin', 'Lifeline Multispeciality Hospital approved by Admin', '2026-02-15 11:00:00'),
('requests',  'req-01',  'REQUEST_CREATED',   'hosp-02',      'hospital', 'Critical request created for 2 units B+', NOW() - INTERVAL 30 MINUTE),
('requests',  'req-01',  'DONOR_NOTIFIED',    'system',       'system', '4 donors notified for request req-01', NOW() - INTERVAL 25 MINUTE),
('requests',  'req-01',  'DONOR_ACCEPTED',    'donor-03',     'donor', 'Donor Rohan Mehta accepted request req-01', NOW() - INTERVAL 15 MINUTE);
