// database/generate_word_doc.js
// Generates a professional, fully-formatted .docx Word Document for RaktSetu Hand-off Report
// Completely anonymous: zero team member names.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  ShadingType
} from 'docx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Color Palette
const COLOR_PRIMARY = '990000';    // Crimson Red
const COLOR_SECONDARY = '1F2937';  // Charcoal Dark
const COLOR_TEXT = '374151';       // Slate Gray
const COLOR_BG_LIGHT = 'F9FAFB';   // Off-white
const COLOR_ACCENT = 'E53E3E';     // Bright Red
const COLOR_BORDER = 'D1D5DB';     // Light Border Gray
const COLOR_HEADER_BG = '8B0000';  // Deep Crimson

const tableBorderConfig = {
  top: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
  left: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
  right: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
};

function headerCell(text, widthPercent) {
  return new TableCell({
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
    shading: { fill: COLOR_HEADER_BG, type: ShadingType.SOLID },
    margins: { top: 120, bottom: 120, left: 150, right: 150 },
    children: [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [
          new TextRun({
            text,
            bold: true,
            color: 'FFFFFF',
            font: 'Calibri',
            size: 20, // 10pt
          }),
        ],
      }),
    ],
  });
}

function dataCell(text, widthPercent, isBold = false, isAlt = false) {
  return new TableCell({
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
    shading: isAlt ? { fill: 'F3F4F6', type: ShadingType.SOLID } : undefined,
    margins: { top: 100, bottom: 100, left: 150, right: 150 },
    borders: tableBorderConfig,
    children: [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [
          new TextRun({
            text,
            bold: isBold,
            color: isBold ? COLOR_SECONDARY : COLOR_TEXT,
            font: 'Calibri',
            size: 19, // 9.5pt
          }),
        ],
      }),
    ],
  });
}

async function generateDoc() {
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Calibri',
            color: COLOR_TEXT,
            size: 22, // 11pt
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1000,
              bottom: 1000,
              left: 1200,
              right: 1200,
            },
          },
        },
        children: [
          // -------------------------------------------------------------
          // TITLE & HEADER BANNER
          // -------------------------------------------------------------
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: 'RAKTSETU (रक्तसेतु)',
                bold: true,
                size: 44, // 22pt
                color: COLOR_PRIMARY,
                font: 'Calibri',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 150 },
            children: [
              new TextRun({
                text: 'Blood Donor & Emergency Request Matcher & Blood Bank Inventory System',
                bold: true,
                size: 26, // 13pt
                color: COLOR_SECONDARY,
                font: 'Calibri',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: [
              new TextRun({
                text: 'Course: CS203 Database Management Systems | SVNIT Surat\nOverall Project Status, Database Verification & Engineering Hand-off Document',
                italics: true,
                size: 20, // 10pt
                color: '6B7280',
                font: 'Calibri',
              }),
            ],
          }),

          // Horizontal divider line
          new Paragraph({
            spacing: { after: 250 },
            children: [
              new TextRun({
                text: '_________________________________________________________________________________',
                color: COLOR_PRIMARY,
                bold: true,
              }),
            ],
          }),

          // -------------------------------------------------------------
          // 1. EXECUTIVE SUMMARY & COMPONENT BREAKDOWN
          // -------------------------------------------------------------
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 150 },
            children: [
              new TextRun({
                text: '1. Executive Summary & Component Breakdown',
                bold: true,
                size: 28,
                color: COLOR_PRIMARY,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: 'This document details the current engineering readiness of the RaktSetu platform across the database, backend API, frontend user interface, and academic submission deliverables. The database component is 100% complete, deployed to the cloud, and empirically verified with zero errors.',
              }),
            ],
          }),

          // Summary Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  headerCell('Component', 22),
                  headerCell('Technical Scope', 38),
                  headerCell('Current Status', 24),
                  headerCell('Readiness', 16),
                ],
              }),
              new TableRow({
                children: [
                  dataCell('Database Layer', 22, true),
                  dataCell('Relational schema, integrity constraints, triggers, procedures, views, cloud event, live data', 38),
                  dataCell('Complete & Verified', 24, true),
                  dataCell('100%', 16, true),
                ],
              }),
              new TableRow({
                children: [
                  dataCell('Frontend UI', 22, true, true),
                  dataCell('React UI, Tailwind styles, dashboards, emergency forms, interactive charts (Mock mode)', 38, false, true),
                  dataCell('Complete (Mock)', 24, true, true),
                  dataCell('100%', 16, true, true),
                ],
              }),
              new TableRow({
                children: [
                  dataCell('Backend API', 22, true),
                  dataCell('Route logic in /api, input validation with Zod, database query handlers', 38),
                  dataCell('Partially Built', 24, true),
                  dataCell('~70%', 16, true),
                ],
              }),
              new TableRow({
                children: [
                  dataCell('Full-Stack Wiring', 22, true, true),
                  dataCell('Local unified server (port 3000), CORS, connecting React to live Aiven MySQL', 38, false, true),
                  dataCell('Pending Server Run', 24, true, true),
                  dataCell('~20%', 16, true, true),
                ],
              }),
              new TableRow({
                children: [
                  dataCell('Academic Deliverables', 22, true),
                  dataCell('DBMS Report, ER Diagram, Normalization proofs (BCNF), Viva demo script', 38),
                  dataCell('In Progress', 24, true),
                  dataCell('~80%', 16, true),
                ],
              }),
            ],
          }),

          // -------------------------------------------------------------
          // 2. COMPLETED DATABASE ARCHITECTURE
          // -------------------------------------------------------------
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 150 },
            children: [
              new TextRun({
                text: '2. What is Completed: Database & DBMS Core (100%)',
                bold: true,
                size: 28,
                color: COLOR_PRIMARY,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 150 },
            children: [
              new TextRun({
                text: 'The database is deployed on an Aiven Cloud MySQL 8.0 cluster (TLS/SSL secured) under schema ',
              }),
              new TextRun({ text: 'defaultdb', bold: true }),
              new TextRun({
                text: '. An independent verification suite executed 84 automated checks against the cloud instance with 84 PASS, 0 FAIL, and 0 NOT TESTED.',
              }),
            ],
          }),

          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 80 },
            children: [
              new TextRun({ text: '17 Relational Base Tables: ', bold: true }),
              new TextRun({
                text: 'audit_logs, blood_groups, camp_registrations, camps, cities, donations, donors, hospitals, inventory_thresholds, request_accepted, request_declined, request_notified, requests, roles, transfers, units, users.',
              }),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 80 },
            children: [
              new TextRun({ text: '24 Foreign Key Constraints: ', bold: true }),
              new TextRun({
                text: 'Strict referential integrity with ON UPDATE CASCADE, ON DELETE RESTRICT, and ON DELETE SET NULL where appropriate.',
              }),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 80 },
            children: [
              new TextRun({ text: '8 Table CHECK Constraints: ', bold: true }),
              new TextRun({
                text: 'Enforces 10-digit phone format, minimum donor weight (>= 45.0 kg), donation unit ranges (1-5), request units (1-10), and unit expiry validation.',
              }),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 80 },
            children: [
              new TextRun({ text: '6 B-Tree Performance Indexes: ', bold: true }),
              new TextRun({
                text: 'idx_donor_match, idx_unit_stock, idx_request_urgency, idx_donation_history, idx_audit_entity, and idx_audit_user for sub-millisecond query execution.',
              }),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 80 },
            children: [
              new TextRun({ text: '5 Clinical & Audit Triggers: ', bold: true }),
              new TextRun({
                text: 'trg_check_donor_age (18-65y), trg_check_donation_cooldown (90-day gap enforcement with SQLSTATE 45000), trg_after_donation_completed (auto barcode blood bag creation & audit sync), trg_audit_request_status, and trg_audit_hospital_status.',
              }),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 80 },
            children: [
              new TextRun({ text: '2 Stored Procedures: ', bold: true }),
              new TextRun({
                text: 'sp_match_emergency_donors (ABO compatibility, 90-day cooldown, rare group priority) and sp_interhospital_transfer (ACID transaction procedure with rollback on failure).',
              }),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 80 },
            children: [
              new TextRun({ text: '3 Analytical Views: ', bold: true }),
              new TextRun({
                text: 'v_blood_stock_summary (live inventory & low-stock flags), v_donor_leaderboard (ranks, badges: GOLD/SILVER/BRONZE), and v_eligible_donors (medical directory).',
              }),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 80 },
            children: [
              new TextRun({ text: '1 Scheduled Background Event: ', bold: true }),
              new TextRun({
                text: 'evt_daily_unit_auto_expiry (daily midnight background scanner that transitions expired bags from AVAILABLE to EXPIRED; event_scheduler is ON).',
              }),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 150 },
            children: [
              new TextRun({ text: 'Realistic Seed Dataset: ', bold: true }),
              new TextRun({
                text: '8 blood groups, 5 cities with GPS coordinates, 20 donors, 6 hospitals, 23 blood bags, 4 emergency requests, and 3 donation camps.',
              }),
            ],
          }),

          // -------------------------------------------------------------
          // 3. REMAINING TASKS BY ROLE
          // -------------------------------------------------------------
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 150 },
            children: [
              new TextRun({
                text: '3. Action Items: What is Remaining',
                bold: true,
                size: 28,
                color: COLOR_PRIMARY,
              }),
            ],
          }),

          // Subheading: Backend
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({
                text: 'A. Backend API Engineering (Immediate Priority)',
                bold: true,
                size: 24,
                color: COLOR_SECONDARY,
              }),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 80 },
            children: [
              new TextRun({ text: 'Build Unified Server Entry (server.js): ', bold: true }),
              new TextRun({
                text: 'Currently, /api contains isolated serverless route files. Create a Node/Express server listening on http://localhost:3000, enable CORS for the Vite frontend (http://localhost:5173), and mount the /api routes.',
              }),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 80 },
            children: [
              new TextRun({ text: 'Connect Endpoints to Stored Procedures: ', bold: true }),
              new TextRun({
                text: 'Replace ad-hoc SQL in /api/match.js with `CALL sp_match_emergency_donors(requestId)`. Use `CALL sp_interhospital_transfer(...)` for stock transfers.',
              }),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 80 },
            children: [
              new TextRun({ text: 'Connect Endpoints to Analytical Views: ', bold: true }),
              new TextRun({
                text: 'Query `SELECT * FROM v_blood_stock_summary WHERE hospital_id = ?` for inventory stock, and `SELECT * FROM v_donor_leaderboard` for rankings.',
              }),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 150 },
            children: [
              new TextRun({ text: 'Handle Clinical Trigger Rejections: ', bold: true }),
              new TextRun({
                text: 'When a donor is ineligible (<90 days cooldown or <18 years), the trigger throws MySQL error SQLSTATE 45000. Catch this in controller and return HTTP 400 Bad Request with err.message to the client.',
              }),
            ],
          }),

          // Subheading: Frontend
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({
                text: 'B. Frontend & Full-Stack Integration',
                bold: true,
                size: 24,
                color: COLOR_SECONDARY,
              }),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 80 },
            children: [
              new TextRun({ text: 'Enable Live API Mode: ', bold: true }),
              new TextRun({
                text: 'Once the server is running on port 3000, ensure VITE_API_URL=http://localhost:3000/api in .env so the frontend ceases falling back to mockApi.js.',
              }),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 150 },
            children: [
              new TextRun({ text: 'Session JWT Compatibility: ', bold: true }),
              new TextRun({
                text: 'Verify that the token returned by /api/auth/login provides { id, role, donor_id, hospital_id } and populates AuthContext appropriately.',
              }),
            ],
          }),

          // Subheading: Academic
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({
                text: 'C. Academic Documentation & Viva Preparation (CS203 DBMS)',
                bold: true,
                size: 24,
                color: COLOR_SECONDARY,
              }),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 80 },
            children: [
              new TextRun({ text: 'DBMS Project Report: ', bold: true }),
              new TextRun({
                text: 'Compile final PDF report with ER Diagram, Relational Schema (17 tables), Normalization proofs (1NF, 2NF, 3NF, BCNF), and advanced SQL logic documentation.',
              }),
            ],
          }),
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 150 },
            children: [
              new TextRun({ text: 'Viva Demonstration Script: ', bold: true }),
              new TextRun({
                text: 'Use `database/verify_database.sql` during the viva to demonstrate matching, views, cooldown trigger rejections, and ACID transfers live on Aiven.',
              }),
            ],
          }),

          // -------------------------------------------------------------
          // 4. TECHNICAL REFERENCE TABLE
          // -------------------------------------------------------------
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 150 },
            children: [
              new TextRun({
                text: '4. Technical Quick Reference for Developers',
                bold: true,
                size: 28,
                color: COLOR_PRIMARY,
              }),
            ],
          }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  headerCell('Database Object', 26),
                  headerCell('Type', 16),
                  headerCell('Invocation Syntax', 34),
                  headerCell('Expected Return', 24),
                ],
              }),
              new TableRow({
                children: [
                  dataCell('sp_match_emergency_donors', 26, true),
                  dataCell('Procedure', 16),
                  dataCell('CALL sp_match_emergency_donors(?);', 34),
                  dataCell('Compatible donors sorted by exact match & rare priority', 24),
                ],
              }),
              new TableRow({
                children: [
                  dataCell('sp_interhospital_transfer', 26, true, true),
                  dataCell('Procedure', 16, false, true),
                  dataCell('CALL sp_interhospital_transfer(?,?,?,?,@s,@m);', 34, false, true),
                  dataCell('@s=1/0 success flag, @m=status message', 24, false, true),
                ],
              }),
              new TableRow({
                children: [
                  dataCell('v_blood_stock_summary', 26, true),
                  dataCell('View', 16),
                  dataCell('SELECT * FROM v_blood_stock_summary;', 34),
                  dataCell('Stock count, thresholds, LOW_STOCK flag', 24),
                ],
              }),
              new TableRow({
                children: [
                  dataCell('v_donor_leaderboard', 26, true, true),
                  dataCell('View', 16, false, true),
                  dataCell('SELECT * FROM v_donor_leaderboard;', 34, false, true),
                  dataCell('Ranks, badges (GOLD/SILVER), eligibility gap', 24, false, true),
                ],
              }),
              new TableRow({
                children: [
                  dataCell('v_eligible_donors', 26, true),
                  dataCell('View', 16),
                  dataCell('SELECT * FROM v_eligible_donors;', 34),
                  dataCell('Medically eligible donors directory', 24),
                ],
              }),
            ],
          }),

          // Demo Logins
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
            children: [
              new TextRun({
                text: 'Seed Demo Accounts for Testing',
                bold: true,
                size: 24,
                color: COLOR_SECONDARY,
              }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  headerCell('Role', 20),
                  headerCell('Username', 20),
                  headerCell('Password', 20),
                  headerCell('Profile & City', 40),
                ],
              }),
              new TableRow({
                children: [
                  dataCell('Admin', 20, true),
                  dataCell('admin', 20),
                  dataCell('admin123', 20),
                  dataCell('System Administrator (Full KPI access)', 40),
                ],
              }),
              new TableRow({
                children: [
                  dataCell('Donor (Eligible)', 20, true, true),
                  dataCell('donor', 20, false, true),
                  dataCell('donor123', 20, false, true),
                  dataCell('Aarav Patel · Surat · O+ · 4 donations (Bronze)', 40, false, true),
                ],
              }),
              new TableRow({
                children: [
                  dataCell('Donor (Cooldown)', 20, true),
                  dataCell('donor2', 20),
                  dataCell('donor123', 20),
                  dataCell('Priya Shah · Surat · A+ · Donated <90d ago', 40),
                ],
              }),
              new TableRow({
                children: [
                  dataCell('Hospital', 20, true, true),
                  dataCell('hospital', 20, false, true),
                  dataCell('hospital123', 20, false, true),
                  dataCell('Civil Hospital & Blood Bank, Surat', 40, false, true),
                ],
              }),
              new TableRow({
                children: [
                  dataCell('Hospital 2', 20, true),
                  dataCell('hospital2', 20),
                  dataCell('hospital123', 20),
                  dataCell('Lifeline Multispeciality Hospital, Surat', 40),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const outPath = path.resolve(__dirname, '../RaktSetu_Project_Status_and_Handoff_Report.docx');
  fs.writeFileSync(outPath, buffer);
  console.log('✅ Successfully created Word Document:', outPath);
}

generateDoc().catch(err => {
  console.error('Error generating document:', err);
  process.exit(1);
});
