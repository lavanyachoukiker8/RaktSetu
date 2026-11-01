-- ============================================================================
-- RaktSetu – Database Security Architecture & Role-Based Access Control (DCL)
-- Course: CS203 DBMS | SVNIT Surat
-- Implements MySQL 8.0 Roles, User Accounts, and Principle of Least Privilege
-- ============================================================================

USE `blood_donor_db`;

-- 1. Create System Database Roles
CREATE ROLE IF NOT EXISTS 'role_system_admin';
CREATE ROLE IF NOT EXISTS 'role_hospital_staff';
CREATE ROLE IF NOT EXISTS 'role_donor_portal';
CREATE ROLE IF NOT EXISTS 'role_public_api';

-- 2. Define Privileges for Administrator Role
-- Full DML, DDL, and View execution rights across all schema objects
GRANT ALL PRIVILEGES ON `blood_donor_db`.* TO 'role_system_admin';

-- 3. Define Privileges for Hospital Staff Role (Principle of Least Privilege)
-- Hospitals can read reference tables, manage inventory bags, log donations, and execute transfers
GRANT SELECT ON `blood_donor_db`.`blood_groups` TO 'role_hospital_staff';
GRANT SELECT ON `blood_donor_db`.`cities` TO 'role_hospital_staff';
GRANT SELECT, UPDATE ON `blood_donor_db`.`hospitals` TO 'role_hospital_staff';
GRANT SELECT, INSERT, UPDATE ON `blood_donor_db`.`units` TO 'role_hospital_staff';
GRANT SELECT, INSERT, UPDATE ON `blood_donor_db`.`inventory_thresholds` TO 'role_hospital_staff';
GRANT SELECT, INSERT ON `blood_donor_db`.`donations` TO 'role_hospital_staff';
GRANT SELECT, INSERT, UPDATE ON `blood_donor_db`.`requests` TO 'role_hospital_staff';
GRANT SELECT, INSERT ON `blood_donor_db`.`transfers` TO 'role_hospital_staff';
GRANT SELECT ON `blood_donor_db`.`request_accepted` TO 'role_hospital_staff';
GRANT SELECT ON `blood_donor_db`.`request_notified` TO 'role_hospital_staff';
GRANT SELECT ON `blood_donor_db`.`v_blood_stock_summary` TO 'role_hospital_staff';
GRANT EXECUTE ON PROCEDURE `blood_donor_db`.`sp_interhospital_transfer` TO 'role_hospital_staff';
GRANT EXECUTE ON PROCEDURE `blood_donor_db`.`sp_match_emergency_donors` TO 'role_hospital_staff';

-- 4. Define Privileges for Registered Donor Role
-- Donors can view and update their own profiles, accept/decline requests, and view leaderboards
GRANT SELECT, UPDATE ON `blood_donor_db`.`donors` TO 'role_donor_portal';
GRANT SELECT ON `blood_donor_db`.`blood_groups` TO 'role_donor_portal';
GRANT SELECT ON `blood_donor_db`.`cities` TO 'role_donor_portal';
GRANT SELECT ON `blood_donor_db`.`camps` TO 'role_donor_portal';
GRANT SELECT, INSERT ON `blood_donor_db`.`camp_registrations` TO 'role_donor_portal';
GRANT SELECT, INSERT ON `blood_donor_db`.`request_accepted` TO 'role_donor_portal';
GRANT SELECT, INSERT ON `blood_donor_db`.`request_declined` TO 'role_donor_portal';
GRANT SELECT ON `blood_donor_db`.`request_notified` TO 'role_donor_portal';
GRANT SELECT ON `blood_donor_db`.`v_donor_leaderboard` TO 'role_donor_portal';
GRANT SELECT ON `blood_donor_db`.`v_eligible_donors` TO 'role_donor_portal';

-- 5. Define Privileges for Public / Anonymous API Role
-- Public users can query public stock views and raise emergency requests
GRANT SELECT ON `blood_donor_db`.`v_blood_stock_summary` TO 'role_public_api';
GRANT SELECT ON `blood_donor_db`.`blood_groups` TO 'role_public_api';
GRANT SELECT ON `blood_donor_db`.`cities` TO 'role_public_api';
GRANT SELECT ON `blood_donor_db`.`camps` TO 'role_public_api';
GRANT SELECT, INSERT ON `blood_donor_db`.`requests` TO 'role_public_api';

-- 6. Create Service Accounts and Assign Roles
CREATE USER IF NOT EXISTS 'admin_user'@'%' IDENTIFIED BY 'AdminRaktSetu@2026';
CREATE USER IF NOT EXISTS 'hospital_svc'@'%' IDENTIFIED BY 'HospService@2026';
CREATE USER IF NOT EXISTS 'donor_svc'@'%' IDENTIFIED BY 'DonorService@2026';
CREATE USER IF NOT EXISTS 'public_svc'@'%' IDENTIFIED BY 'PublicGuest@2026';

GRANT 'role_system_admin' TO 'admin_user'@'%';
GRANT 'role_hospital_staff' TO 'hospital_svc'@'%';
GRANT 'role_donor_portal' TO 'donor_svc'@'%';
GRANT 'role_public_api' TO 'public_svc'@'%';

-- Activate default roles upon login
SET DEFAULT ROLE 'role_system_admin' TO 'admin_user'@'%';
SET DEFAULT ROLE 'role_hospital_staff' TO 'hospital_svc'@'%';
SET DEFAULT ROLE 'role_donor_portal' TO 'donor_svc'@'%';
SET DEFAULT ROLE 'role_public_api' TO 'public_svc'@'%';

FLUSH PRIVILEGES;
