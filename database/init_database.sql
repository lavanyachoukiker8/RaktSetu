-- ============================================================================
-- RaktSetu – Master All-in-One Database Initialization Script
-- Course: CS203 DBMS | SVNIT Surat
-- Single script that sets up schema, constraints, triggers, events,
-- stored procedures, views, reference data, and realistic seed data.
-- Run in MySQL Workbench (Ctrl+Shift+Enter) or via MySQL CLI.
-- ============================================================================

-- Step 1: Create Database
CREATE DATABASE IF NOT EXISTS `blood_donor_db`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `blood_donor_db`;

-- Step 2: Source Schema
SOURCE schema.sql;

-- Step 3: Source Reference Lookup Data
SOURCE reference-data.sql;

-- Step 4: Source Triggers, Events, Views, and Procedures
SOURCE triggers_and_views.sql;

-- Step 5: Source Realistic Seed Data
SOURCE seed.sql;

-- Verification summary
SELECT 'Database initialization complete!' AS `Status`;
SELECT COUNT(*) AS `Total_Blood_Groups` FROM `blood_groups`;
SELECT COUNT(*) AS `Total_Cities` FROM `cities`;
SELECT COUNT(*) AS `Total_Hospitals` FROM `hospitals`;
SELECT COUNT(*) AS `Total_Donors` FROM `donors`;
SELECT COUNT(*) AS `Total_Blood_Units` FROM `units`;
SELECT COUNT(*) AS `Total_Requests` FROM `requests`;
SELECT COUNT(*) AS `Total_Camps` FROM `camps`;
