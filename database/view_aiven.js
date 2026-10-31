// database/view_aiven.js
// Inspects the live Aiven database and displays all tables, row counts, and sample data.

import pool from '../backend/db.js';

async function inspectAiven() {
  console.log('========================================================');
  console.log('☁️  CONNECTED TO AIVEN CLOUD MYSQL:');
  console.log('   Host:     mysql-1151a67-raktsetu-web.d.aivencloud.com');
  console.log('   Port:     15435');
  console.log('   Database: defaultdb');
  console.log('   User:     avnadmin');
  console.log('========================================================\n');

  try {
    const [tables] = await pool.query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");
    const tableCounts = [];

    for (const row of tables) {
      const tableName = Object.values(row)[0];
      const [cntResult] = await pool.query(`SELECT COUNT(*) as cnt FROM \`${tableName}\``);
      tableCounts.push({
        'Table Name': tableName,
        'Row Count': cntResult[0].cnt,
        'Type': 'Base Table'
      });
    }

    const [views] = await pool.query("SHOW FULL TABLES WHERE Table_type = 'VIEW'");
    for (const row of views) {
      const viewName = Object.values(row)[0];
      tableCounts.push({
        'Table Name': viewName,
        'Row Count': '-',
        'Type': 'Analytical View'
      });
    }

    console.table(tableCounts);

    console.log('\n--- Sample Live Records from Aiven (donors table) ---');
    const [sampleDonors] = await pool.query(
      'SELECT id, name, blood_group, city, phone, donation_count FROM donors LIMIT 5'
    );
    console.table(sampleDonors);

    console.log('\n--- Sample Live Records from Aiven (hospitals table) ---');
    const [sampleHospitals] = await pool.query(
      'SELECT id, name, city, status, phone FROM hospitals'
    );
    console.table(sampleHospitals);

  } catch (err) {
    console.error('Error querying Aiven:', err.message);
  } finally {
    await pool.end();
  }
}

inspectAiven();
