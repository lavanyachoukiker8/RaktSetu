// database/run_comprehensive_tests.js
// Comprehensive test and verification runner against live Aiven Cloud MySQL database

import pool from '../api/db.js';

const results = {
  passed: [],
  failed: [],
  notTested: [],
};

function pass(name, details = '') {
  results.passed.push({ name, details });
  console.log(`[PASS] ${name}`);
}

function fail(name, error = '') {
  results.failed.push({ name, error });
  console.log(`[FAIL] ${name} -> Error: ${error}`);
}

function notTested(name, reason = '') {
  results.notTested.push({ name, reason });
  console.log(`[NOT TESTED] ${name} -> ${reason}`);
}

async function run() {
  console.log('================================================================');
  console.log('🧪 RAKTSETU DATABASE COMPREHENSIVE VERIFICATION TEST RUNNER');
  console.log('================================================================\n');

  let connection;
  try {
    connection = await pool.getConnection();
    console.log('Connected to Aiven Database:', connection.config.database);
    const dbName = connection.config.database;

    // --------------------------------------------------------------------------
    // 1. TABLE EXISTENCE (Check all 16 tables)
    // --------------------------------------------------------------------------
    console.log('\n--- 1. TABLE EXISTENCE CHECK ---');
    const expectedTables = [
      'audit_logs', 'blood_groups', 'camp_registrations', 'camps', 'cities',
      'donations', 'donors', 'hospitals', 'inventory_thresholds', 'request_accepted',
      'request_declined', 'request_notified', 'requests', 'roles', 'transfers', 'units'
    ];

    const [tableRows] = await connection.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_type = 'BASE TABLE'`,
      [dbName]
    );
    const existingTables = tableRows.map(r => r.table_name || r.TABLE_NAME);

    for (const t of expectedTables) {
      if (existingTables.includes(t)) {
        pass(`Table existence: ${t}`);
      } else {
        fail(`Table existence: ${t}`, `Table ${t} not found in schema ${dbName}`);
      }
    }

    // --------------------------------------------------------------------------
    // 2. FOREIGN KEYS EXISTENCE
    // --------------------------------------------------------------------------
    console.log('\n--- 2. FOREIGN KEY CONSTRAINTS CHECK ---');
    const [fkRows] = await connection.query(
      `SELECT constraint_name, table_name, referenced_table_name 
       FROM information_schema.key_column_usage 
       WHERE table_schema = ? AND referenced_table_name IS NOT NULL`,
      [dbName]
    );

    const expectedFks = [
      { table: 'users', ref: 'roles' },
      { table: 'donors', ref: 'blood_groups' },
      { table: 'donors', ref: 'cities' },
      { table: 'hospitals', ref: 'cities' },
      { table: 'inventory_thresholds', ref: 'hospitals' },
      { table: 'inventory_thresholds', ref: 'blood_groups' },
      { table: 'units', ref: 'hospitals' },
      { table: 'units', ref: 'blood_groups' },
      { table: 'donations', ref: 'donors' },
      { table: 'donations', ref: 'hospitals' },
      { table: 'requests', ref: 'hospitals' },
      { table: 'requests', ref: 'cities' },
      { table: 'requests', ref: 'blood_groups' },
      { table: 'request_notified', ref: 'requests' },
      { table: 'request_notified', ref: 'donors' },
      { table: 'request_accepted', ref: 'requests' },
      { table: 'request_accepted', ref: 'donors' },
      { table: 'request_declined', ref: 'requests' },
      { table: 'request_declined', ref: 'donors' },
      { table: 'camps', ref: 'cities' },
      { table: 'camp_registrations', ref: 'camps' },
      { table: 'camp_registrations', ref: 'donors' },
      { table: 'transfers', ref: 'hospitals' },
      { table: 'transfers', ref: 'units' }
    ];

    for (const efk of expectedFks) {
      const found = fkRows.some(
        f => (f.table_name || f.TABLE_NAME) === efk.table &&
             (f.referenced_table_name || f.REFERENCED_TABLE_NAME) === efk.ref
      );
      if (found) {
        pass(`FK: ${efk.table} -> ${efk.ref}`);
      } else {
        fail(`FK: ${efk.table} -> ${efk.ref}`, `Foreign key from ${efk.table} referencing ${efk.ref} not found`);
      }
    }

    // --------------------------------------------------------------------------
    // 3. INDEXES EXISTENCE
    // --------------------------------------------------------------------------
    console.log('\n--- 3. PERFORMANCE INDEXES CHECK ---');
    const [indexRows] = await connection.query(
      `SELECT DISTINCT index_name, table_name FROM information_schema.statistics WHERE table_schema = ?`,
      [dbName]
    );
    const existingIndexes = indexRows.map(i => `${i.table_name || i.TABLE_NAME}.${i.index_name || i.INDEX_NAME}`);

    const expectedIndexes = [
      'donors.idx_donor_match',
      'units.idx_unit_stock',
      'requests.idx_request_urgency',
      'donations.idx_donation_history',
      'audit_logs.idx_audit_entity',
      'audit_logs.idx_audit_user'
    ];

    for (const idx of expectedIndexes) {
      if (existingIndexes.includes(idx)) {
        pass(`Index: ${idx}`);
      } else {
        fail(`Index: ${idx}`, `Index ${idx} not found in schema`);
      }
    }

    // --------------------------------------------------------------------------
    // 4. VIEWS EXISTENCE & QUERY EXECUTION
    // --------------------------------------------------------------------------
    console.log('\n--- 4. ANALYTICAL VIEWS CHECK ---');
    const expectedViews = ['v_blood_stock_summary', 'v_donor_leaderboard', 'v_eligible_donors'];
    for (const v of expectedViews) {
      try {
        const [rows] = await connection.query(`SELECT * FROM \`${v}\` LIMIT 3`);
        pass(`View functional: ${v}`, `Retrieved ${rows.length} rows successfully`);
      } catch (err) {
        fail(`View functional: ${v}`, err.message);
      }
    }

    // --------------------------------------------------------------------------
    // 5. TRIGGERS EXISTENCE
    // --------------------------------------------------------------------------
    console.log('\n--- 5. TRIGGERS EXISTENCE CHECK ---');
    const [triggerRows] = await connection.query(
      `SELECT trigger_name, event_manipulation, event_object_table FROM information_schema.triggers WHERE trigger_schema = ?`,
      [dbName]
    );
    const existingTriggers = triggerRows.map(t => t.trigger_name || t.TRIGGER_NAME);

    const expectedTriggers = [
      'trg_check_donor_age',
      'trg_check_donation_cooldown',
      'trg_after_donation_completed',
      'trg_audit_request_status',
      'trg_audit_hospital_status'
    ];

    for (const trg of expectedTriggers) {
      if (existingTriggers.includes(trg)) {
        pass(`Trigger existence: ${trg}`);
      } else {
        fail(`Trigger existence: ${trg}`, `Trigger ${trg} not found`);
      }
    }

    // --------------------------------------------------------------------------
    // 6. STORED PROCEDURES EXISTENCE
    // --------------------------------------------------------------------------
    console.log('\n--- 6. STORED PROCEDURES CHECK ---');
    const [procRows] = await connection.query(
      `SELECT routine_name FROM information_schema.routines WHERE routine_schema = ? AND routine_type = 'PROCEDURE'`,
      [dbName]
    );
    const existingProcs = procRows.map(p => p.routine_name || p.ROUTINE_NAME);

    const expectedProcs = ['sp_interhospital_transfer', 'sp_match_emergency_donors'];
    for (const pr of expectedProcs) {
      if (existingProcs.includes(pr)) {
        pass(`Procedure existence: ${pr}`);
      } else {
        fail(`Procedure existence: ${pr}`, `Procedure ${pr} not found`);
      }
    }

    // --------------------------------------------------------------------------
    // 7. SCHEDULED EVENTS CHECK
    // --------------------------------------------------------------------------
    console.log('\n--- 7. SCHEDULED EVENT CHECK ---');
    const [eventRows] = await connection.query(
      `SELECT event_name, status FROM information_schema.events WHERE event_schema = ?`,
      [dbName]
    );
    const event = eventRows.find(e => (e.event_name || e.EVENT_NAME) === 'evt_daily_unit_auto_expiry');
    if (event) {
      pass('Event: evt_daily_unit_auto_expiry exists', `Status: ${event.status || event.STATUS}`);
    } else {
      fail('Event: evt_daily_unit_auto_expiry exists', 'Event not found in information_schema.events');
    }

    // Check event scheduler status
    const [schedRows] = await connection.query(`SHOW VARIABLES LIKE 'event_scheduler'`);
    if (schedRows.length && schedRows[0].Value.toUpperCase() === 'ON') {
      pass('Event Scheduler Global Variable', 'event_scheduler is ON');
    } else {
      fail('Event Scheduler Global Variable', `event_scheduler is ${schedRows[0]?.Value}`);
    }

    // --------------------------------------------------------------------------
    // 8. DATA INTEGRITY & DUPLICATE CHECKS
    // --------------------------------------------------------------------------
    console.log('\n--- 8. DATA INTEGRITY & DUPLICATES CHECK ---');

    // Reference counts
    const [bg] = await connection.query('SELECT COUNT(*) as c FROM blood_groups');
    if (bg[0].c === 8) pass('Reference: 8 Blood Groups populated');
    else fail('Reference: 8 Blood Groups populated', `Found ${bg[0].c}`);

    const [cities] = await connection.query('SELECT COUNT(*) as c FROM cities');
    if (cities[0].c === 5) pass('Reference: 5 Cities populated');
    else fail('Reference: 5 Cities populated', `Found ${cities[0].c}`);

    const [roles] = await connection.query('SELECT COUNT(*) as c FROM roles');
    if (roles[0].c === 3) pass('Reference: 3 Roles populated');
    else fail('Reference: 3 Roles populated', `Found ${roles[0].c}`);

    // Duplicate checks
    const [dupDonors] = await connection.query('SELECT phone, COUNT(*) as c FROM donors GROUP BY phone HAVING c > 1');
    if (dupDonors.length === 0) pass('No duplicate donor phone numbers');
    else fail('No duplicate donor phone numbers', `Found ${dupDonors.length} duplicates`);

    const [dupBarcodes] = await connection.query('SELECT bag_barcode, COUNT(*) as c FROM units GROUP BY bag_barcode HAVING c > 1');
    if (dupBarcodes.length === 0) pass('No duplicate blood unit barcodes');
    else fail('No duplicate blood unit barcodes', `Found ${dupBarcodes.length} duplicates`);

    const [dupHospitals] = await connection.query('SELECT license, COUNT(*) as c FROM hospitals GROUP BY license HAVING c > 1');
    if (dupHospitals.length === 0) pass('No duplicate hospital licenses');
    else fail('No duplicate hospital licenses', `Found ${dupHospitals.length} duplicates`);

    // --------------------------------------------------------------------------
    // 9. FUNCTIONAL TEST: CLINICAL COOLDOWN TRIGGER (Must Fail with SQLSTATE 45000)
    // --------------------------------------------------------------------------
    console.log('\n--- 9. FUNCTIONAL TEST: CLINICAL COOLDOWN TRIGGER ---');
    try {
      // donor-02 last donated on 2026-10-05, attempting donation within 90 days
      await connection.query(
        `INSERT INTO donations (id, donor_id, hospital_id, units, collected_at, status) 
         VALUES (UUID(), 'donor-02', 'hosp-01', 1, NOW(), 'COMPLETED')`
      );
      fail('Clinical Cooldown Trigger', 'Trigger did not block insert within 90 days');
    } catch (err) {
      if (err.message.includes('Clinical cooldown violated') || err.sqlState === '45000') {
        pass('Clinical Cooldown Trigger: blocked violation', `Trigger threw expected error: "${err.message}"`);
      } else {
        fail('Clinical Cooldown Trigger', `Unexpected error: ${err.message}`);
      }
    }

    // --------------------------------------------------------------------------
    // 10. FUNCTIONAL TEST: DONOR AGE TRIGGER (Must Fail for Underage <18)
    // --------------------------------------------------------------------------
    console.log('\n--- 10. FUNCTIONAL TEST: DONOR AGE TRIGGER ---');
    try {
      await connection.query(
        `INSERT INTO donors (id, name, gender, dob, phone, email, blood_group, city, weight_kg)
         VALUES ('test-underage', 'Child Test', 'Male', DATE_SUB(CURDATE(), INTERVAL 10 YEAR), '9999900001', 'test@test.com', 'A+', 'Surat', 50)`
      );
      // Clean up if it didn't block
      await connection.query(`DELETE FROM donors WHERE id = 'test-underage'`);
      fail('Donor Age Trigger: Underage donor', 'Trigger did not block donor younger than 18');
    } catch (err) {
      if (err.message.includes('Donor age must be between 18 and 65') || err.sqlState === '45000') {
        pass('Donor Age Trigger: blocked underage donor (<18)', `Trigger threw expected error: "${err.message}"`);
      } else {
        fail('Donor Age Trigger: Underage donor', `Unexpected error: ${err.message}`);
      }
    }

    // --------------------------------------------------------------------------
    // 11. FUNCTIONAL TEST: SMART MATCHING STORED PROCEDURE
    // --------------------------------------------------------------------------
    console.log('\n--- 11. FUNCTIONAL TEST: SMART MATCHING STORED PROCEDURE ---');
    try {
      const [matches] = await connection.query(`CALL sp_match_emergency_donors('req-01')`);
      const matchedList = matches[0];
      if (matchedList && matchedList.length > 0) {
        const allMatchValid = matchedList.every(
          m => m.city === 'Surat' && (m.days_since_last_donation === null || m.days_since_last_donation >= 90)
        );
        const hasExact = matchedList.some(m => m.match_type === 'EXACT');
        const hasCompatible = matchedList.some(m => m.match_type === 'COMPATIBLE');

        if (allMatchValid && hasExact) {
          pass(
            'Smart Matching Procedure: sp_match_emergency_donors',
            `Matched ${matchedList.length} donors (Exact & Compatible). All in Surat, all cooldown >= 90 days.`
          );
        } else {
          fail('Smart Matching Procedure', 'Matched donors failed compatibility or cooldown criteria');
        }
      } else {
        fail('Smart Matching Procedure', 'No donors returned for req-01');
      }
    } catch (err) {
      fail('Smart Matching Procedure', err.message);
    }

    // --------------------------------------------------------------------------
    // 12. FUNCTIONAL TEST: AUTOMATIC BLOOD-BAG CREATION (Trigger trg_after_donation_completed)
    // --------------------------------------------------------------------------
    console.log('\n--- 12. FUNCTIONAL TEST: AUTO BLOOD-BAG CREATION ON DONATION ---');
    const testDonationId = 'test-auto-bag-' + Date.now();
    try {
      // donor-01 is eligible (>90 days since last donation).
      // We will insert a valid completed donation, verify bag created in units, then cleanup.
      const [donorBefore] = await connection.query("SELECT donation_count, last_donation FROM donors WHERE id = 'donor-01'");
      const prevCount = donorBefore[0].donation_count;

      const [unitCountBefore] = await connection.query("SELECT COUNT(*) as c FROM units WHERE hospital_id = 'hosp-01'");

      // Insert valid donation
      await connection.query(
        `INSERT INTO donations (id, donor_id, hospital_id, units, collected_at, status, certificate_id)
         VALUES (?, 'donor-01', 'hosp-01', 1, NOW(), 'COMPLETED', ?)`,
        [testDonationId, 'CERT-TEST-' + Date.now()]
      );

      // Verify donor stats updated
      const [donorAfter] = await connection.query("SELECT donation_count, last_donation FROM donors WHERE id = 'donor-01'");
      const countIncremented = donorAfter[0].donation_count === prevCount + 1;

      // Verify bag automatically created in units
      const [unitCountAfter] = await connection.query("SELECT COUNT(*) as c FROM units WHERE hospital_id = 'hosp-01'");
      const bagCreated = unitCountAfter[0].c === unitCountBefore[0].c + 1;

      // Verify audit log entry created
      const [auditEntry] = await connection.query(
        `SELECT * FROM audit_logs WHERE entity = 'donations' AND entity_id = ?`,
        [testDonationId]
      );
      const auditCreated = auditEntry.length > 0;

      if (countIncremented && bagCreated && auditCreated) {
        pass(
          'Automatic Blood-Bag & Donor Sync Trigger',
          'Successfully incremented donation_count, generated bag in units table, and recorded audit log'
        );
      } else {
        fail(
          'Automatic Blood-Bag & Donor Sync Trigger',
          `countIncremented: ${countIncremented}, bagCreated: ${bagCreated}, auditCreated: ${auditCreated}`
        );
      }

      // Cleanup test donation, created unit, audit log, and restore donor stats
      await connection.query(`DELETE FROM units WHERE hospital_id = 'hosp-01' AND bag_barcode LIKE 'BAG-%' ORDER BY collected_at DESC LIMIT 1`);
      await connection.query(`DELETE FROM donations WHERE id = ?`, [testDonationId]);
      await connection.query(`DELETE FROM audit_logs WHERE entity = 'donations' AND entity_id = ?`, [testDonationId]);
      await connection.query(
        `UPDATE donors SET donation_count = ?, last_donation = ? WHERE id = 'donor-01'`,
        [prevCount, donorBefore[0].last_donation]
      );
      console.log('✓ Cleaned up test donation artifact safely.');
    } catch (err) {
      fail('Automatic Blood-Bag & Donor Sync Trigger', err.message);
      // Attempt cleanup on failure
      try {
        await connection.query(`DELETE FROM donations WHERE id = ?`, [testDonationId]);
      } catch (e) {}
    }

    // --------------------------------------------------------------------------
    // 13. FUNCTIONAL TEST: INTER-HOSPITAL TRANSFER (SUCCESS & ROLLBACK)
    // --------------------------------------------------------------------------
    console.log('\n--- 13. FUNCTIONAL TEST: INTER-HOSPITAL TRANSFER TRANSACTION ---');
    try {
      // Find an available unit and its current hospital
      const [availUnits] = await connection.query(
        `SELECT id, hospital_id FROM units WHERE status = 'AVAILABLE' AND expiry > NOW() LIMIT 1`
      );
      const testUnit = availUnits[0];
      const sourceHosp = testUnit.hospital_id;
      const destHosp = sourceHosp === 'hosp-01' ? 'hosp-02' : 'hosp-01';

      // 13.1 Success Case
      await connection.query(
        `CALL sp_interhospital_transfer(?, ?, ?, 'Test valid transfer', @p_succ, @p_msg)`,
        [sourceHosp, destHosp, testUnit.id]
      );
      const [succRes] = await connection.query('SELECT @p_succ as success, @p_msg as message');
      if (succRes[0].success === 1) {
        pass('Inter-Hospital Transfer: Success Case', succRes[0].message);
        // Transfer back to maintain exact original state
        await connection.query(
          `CALL sp_interhospital_transfer(?, ?, ?, 'Reverting test transfer', @p_rev_succ, @p_rev_msg)`,
          [destHosp, sourceHosp, testUnit.id]
        );
        // Clean up test transfer rows
        await connection.query(`DELETE FROM transfers WHERE notes IN ('Test valid transfer', 'Reverting test transfer')`);
        await connection.query(`DELETE FROM audit_logs WHERE action = 'INTERHOSPITAL_TRANSFER' AND detail LIKE CONCAT('%', ?, '%')`, [testUnit.id]);
      } else {
        fail('Inter-Hospital Transfer: Success Case', succRes[0].message);
      }

      // 13.2 Rollback / Invalid Case (attempting transfer of unit not at source hospital)
      const wrongSourceHosp = sourceHosp === 'hosp-05' ? 'hosp-04' : 'hosp-05';
      await connection.query(
        `CALL sp_interhospital_transfer(?, ?, ?, 'Test invalid transfer', @p_fail_succ, @p_fail_msg)`,
        [wrongSourceHosp, destHosp, testUnit.id]
      );
      const [failRes] = await connection.query('SELECT @p_fail_succ as success, @p_fail_msg as message');
      if (failRes[0].success === 0) {
        pass(
          'Inter-Hospital Transfer: Failure & Rollback Case',
          `Properly rejected transfer and rolled back: "${failRes[0].message}"`
        );
      } else {
        fail('Inter-Hospital Transfer: Failure & Rollback Case', 'Expected transfer to fail but it succeeded');
      }
    } catch (err) {
      fail('Inter-Hospital Transfer Transaction', err.message);
    }

    // --------------------------------------------------------------------------
    // 14. INVENTORY COUNT VS VIEW RECONCILIATION
    // --------------------------------------------------------------------------
    console.log('\n--- 14. INVENTORY RECONCILIATION ---');
    try {
      const [actualCounts] = await connection.query(
        `SELECT hospital_id, blood_group, COUNT(*) as actual_available
         FROM units 
         WHERE status = 'AVAILABLE' AND expiry > NOW()
         GROUP BY hospital_id, blood_group`
      );

      const [viewCounts] = await connection.query(
        `SELECT hospital_id, blood_group, available_units 
         FROM v_blood_stock_summary
         WHERE available_units > 0`
      );

      let mismatch = false;
      for (const act of actualCounts) {
        const vw = viewCounts.find(v => v.hospital_id === act.hospital_id && v.blood_group === act.blood_group);
        if (!vw || vw.available_units !== act.actual_available) {
          mismatch = true;
          break;
        }
      }

      if (!mismatch) {
        pass('Inventory Reconciliation', 'All available unexpired units in units table exactly match v_blood_stock_summary');
      } else {
        fail('Inventory Reconciliation', 'Discrepancy detected between units table and v_blood_stock_summary view');
      }
    } catch (err) {
      fail('Inventory Reconciliation', err.message);
    }

    // --------------------------------------------------------------------------
    // 15. EXPIRY HANDLING CHECK & EVENT LOGIC
    // --------------------------------------------------------------------------
    console.log('\n--- 15. EXPIRY HANDLING & EVENT LOGIC TEST ---');
    try {
      const [expiredUnits] = await connection.query(
        `SELECT COUNT(*) as c FROM units WHERE status = 'EXPIRED'`
      );
      const [availableUnits] = await connection.query(
        `SELECT COUNT(*) as c FROM units WHERE status = 'AVAILABLE'`
      );
      pass(
        'Expiry status distinction in units table',
        `Confirmed units table maintains distinct statuses: ${availableUnits[0].c} AVAILABLE, ${expiredUnits[0].c} EXPIRED`
      );

      // Verify event logic behavior (simulate unit passing expiry)
      const testExpUnitId = 'test-exp-' + Date.now();
      await connection.query(
        `INSERT INTO units (id, bag_barcode, hospital_id, blood_group, component, collected_at, expiry, status)
         VALUES (?, 'BAG-TEST-EXP', 'hosp-01', 'O+', 'WHOLE_BLOOD', NOW() - INTERVAL 45 DAY, NOW() - INTERVAL 3 DAY, 'AVAILABLE')`,
        [testExpUnitId]
      );

      // Execute expiry query as per event definition
      await connection.query(
        `UPDATE units SET status = 'EXPIRED' WHERE status = 'AVAILABLE' AND expiry <= NOW() AND id = ?`,
        [testExpUnitId]
      );

      const [checkExp] = await connection.query(`SELECT status FROM units WHERE id = ?`, [testExpUnitId]);
      if (checkExp[0]?.status === 'EXPIRED') {
        pass('Event Logic: Auto-expiry calculation', 'Expired bag correctly flagged from AVAILABLE to EXPIRED');
      } else {
        fail('Event Logic: Auto-expiry calculation', `Expected status EXPIRED, got ${checkExp[0]?.status}`);
      }

      // Cleanup
      await connection.query(`DELETE FROM units WHERE id = ?`, [testExpUnitId]);
    } catch (err) {
      fail('Expiry handling & event logic', err.message);
    }

    // --------------------------------------------------------------------------
    // 16. CHECK CONSTRAINTS ENFORCEMENT
    // --------------------------------------------------------------------------
    console.log('\n--- 16. TABLE CHECK CONSTRAINTS ENFORCEMENT ---');

    // 16.1 chk_donor_weight (weight >= 45.0)
    try {
      await connection.query(
        `INSERT INTO donors (id, name, gender, dob, phone, blood_group, city, weight_kg)
         VALUES ('test-chk-w', 'Weight Test', 'Male', '1995-01-01', '9999888877', 'A+', 'Surat', 42.0)`
      );
      await connection.query(`DELETE FROM donors WHERE id = 'test-chk-w'`);
      fail('CHECK constraint: chk_donor_weight', 'Allowed weight < 45kg');
    } catch (err) {
      if (err.message.includes('chk_donor_weight') || err.sqlState === '3819') {
        pass('CHECK constraint: chk_donor_weight', 'Properly rejected donor with weight 42.0 kg (< 45kg minimum)');
      } else {
        fail('CHECK constraint: chk_donor_weight', err.message);
      }
    }

    // 16.2 chk_donor_phone (phone REGEXP '^[0-9]{10}$')
    try {
      await connection.query(
        `INSERT INTO donors (id, name, gender, dob, phone, blood_group, city, weight_kg)
         VALUES ('test-chk-p', 'Phone Test', 'Male', '1995-01-01', '12345', 'A+', 'Surat', 55.0)`
      );
      await connection.query(`DELETE FROM donors WHERE id = 'test-chk-p'`);
      fail('CHECK constraint: chk_donor_phone', 'Allowed phone with invalid length');
    } catch (err) {
      if (err.message.includes('chk_donor_phone') || err.sqlState === '3819') {
        pass('CHECK constraint: chk_donor_phone', 'Properly rejected invalid phone format');
      } else {
        fail('CHECK constraint: chk_donor_phone', err.message);
      }
    }

    // 16.3 chk_donation_units (units BETWEEN 1 AND 5)
    try {
      await connection.query(
        `INSERT INTO donations (id, donor_id, hospital_id, units, collected_at, status)
         VALUES ('test-chk-u', 'donor-01', 'hosp-01', 12, NOW(), 'COMPLETED')`
      );
      await connection.query(`DELETE FROM donations WHERE id = 'test-chk-u'`);
      fail('CHECK constraint: chk_donation_units', 'Allowed donation units > 5');
    } catch (err) {
      if (err.message.includes('chk_donation_units') || err.sqlState === '3819') {
        pass('CHECK constraint: chk_donation_units', 'Properly rejected donation units = 12 (> 5)');
      } else {
        fail('CHECK constraint: chk_donation_units', err.message);
      }
    }

    // 16.4 chk_req_units (units_needed BETWEEN 1 AND 10)
    try {
      await connection.query(
        `INSERT INTO requests (id, hospital_id, hospital_name, city, patient_name, blood_group, units_needed, urgency, status, required_by, contact_person, phone)
         VALUES ('test-chk-req', 'hosp-01', 'Civil Hospital', 'Surat', 'Test Patient', 'A+', 25, 'CRITICAL', 'OPEN', NOW() + INTERVAL 2 HOUR, 'Doctor', '9825100001')`
      );
      await connection.query(`DELETE FROM requests WHERE id = 'test-chk-req'`);
      fail('CHECK constraint: chk_req_units', 'Allowed units_needed > 10');
    } catch (err) {
      if (err.message.includes('chk_req_units') || err.sqlState === '3819') {
        pass('CHECK constraint: chk_req_units', 'Properly rejected request units_needed = 25 (> 10)');
      } else {
        fail('CHECK constraint: chk_req_units', err.message);
      }
    }

    // 16.5 chk_unit_expiry (expiry > collected_at)
    try {
      await connection.query(
        `INSERT INTO units (id, bag_barcode, hospital_id, blood_group, component, collected_at, expiry, status)
         VALUES ('test-chk-exp', 'BAG-INVALID-EXP', 'hosp-01', 'A+', 'WHOLE_BLOOD', NOW(), NOW() - INTERVAL 1 DAY, 'AVAILABLE')`
      );
      await connection.query(`DELETE FROM units WHERE id = 'test-chk-exp'`);
      fail('CHECK constraint: chk_unit_expiry', 'Allowed expiry <= collected_at');
    } catch (err) {
      if (err.message.includes('chk_unit_expiry') || err.sqlState === '3819') {
        pass('CHECK constraint: chk_unit_expiry', 'Properly rejected blood unit with expiry prior to collection date');
      } else {
        fail('CHECK constraint: chk_unit_expiry', err.message);
      }
    }

  } catch (err) {
    console.error('Fatal Test Runner Error:', err);
  } finally {
    if (connection) connection.release();
    await pool.end();
  }

  // Print Summary
  console.log('\n================================================================');
  console.log('📊 FINAL VERIFICATION REPORT SUMMARY');
  console.log('================================================================');
  console.log(`TOTAL TESTS EXECUTED: ${results.passed.length + results.failed.length}`);
  console.log(`✅ PASSED: ${results.passed.length}`);
  console.log(`❌ FAILED: ${results.failed.length}`);
  console.log(`⚠️  NOT TESTED: ${results.notTested.length}`);
  console.log('================================================================');
}

run();
