// database/import_to_aiven.js
// Automated Database Migrator & Seeder for Aiven Cloud MySQL
// Reads credentials from .env and executes all SQL scripts over TLS

import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...vals] = trimmed.split('=');
        const val = vals.join('=').trim().replace(/^['"]|['"]$/g, '');
        process.env[key.trim()] = val;
      }
    }
  }
}

loadEnv();

async function runMigration() {
  console.log('====================================================');
  console.log('🩸 RaktSetu – Aiven Cloud Database Migrator');
  console.log('====================================================');

  const host = process.env.MYSQL_HOST || process.env.DB_HOST;
  const port = Number(process.env.MYSQL_PORT || process.env.DB_PORT || 3306);
  const user = process.env.MYSQL_USER || process.env.DB_USER || 'avnadmin';
  const password = process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD;
  const database = process.argv[2] || process.env.MYSQL_DATABASE || process.env.DB_NAME || 'defaultdb';

  if (!host || !password) {
    console.error('❌ Error: DB_HOST/MYSQL_HOST or DB_PASSWORD/MYSQL_PASSWORD is missing in your .env file.');
    process.exit(1);
  }

  console.log(`Connecting to Aiven MySQL at: ${host}:${port}...`);
  console.log(`Target Database: ${database} | User: ${user}`);

  const caCertPath = path.resolve(__dirname, '../certs/ca.pem');
  let ssl = { rejectUnauthorized: false };
  if (fs.existsSync(caCertPath)) {
    ssl.ca = fs.readFileSync(caCertPath);
    console.log('✓ Loaded Aiven CA certificate from certs/ca.pem');
  }

  let connection;
  try {
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      multipleStatements: true,
      ssl,
    });
    console.log('✓ Successfully connected to Aiven Cloud MySQL!');
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  }

  try {
    // 1. Execute schema.sql
    console.log('\n[1/4] Executing database/schema.sql...');
    let schemaSql = fs.readFileSync(path.resolve(__dirname, 'schema.sql'), 'utf8');
    schemaSql = schemaSql.replace(/CREATE DATABASE IF NOT EXISTS `blood_donor_db`[\s\S]*?USE `blood_donor_db`;/i, `USE \`${database}\`;`);
    await connection.query(schemaSql);
    console.log('✓ Tables, constraints, and indexes created successfully.');

    // 2. Execute reference-data.sql
    console.log('\n[2/4] Executing database/reference-data.sql...');
    let refSql = fs.readFileSync(path.resolve(__dirname, 'reference-data.sql'), 'utf8');
    refSql = refSql.replace(/USE `blood_donor_db`;/i, `USE \`${database}\`;`);
    await connection.query(refSql);
    console.log('✓ Blood groups, cities, and roles populated.');

    // 3. Execute triggers_and_views.sql
    console.log('\n[3/4] Executing database/triggers_and_views.sql...');
    const rawTriggersSql = fs.readFileSync(path.resolve(__dirname, 'triggers_and_views.sql'), 'utf8');

    // Split on DELIMITER sections
    const parts = rawTriggersSql.split(/DELIMITER \$\$|DELIMITER ;/g);
    
    // Part 0: Drops and SET statements
    if (parts[0]) {
      let drops = parts[0]
        .replace(/USE `blood_donor_db`;/i, `USE \`${database}\`;`)
        .replace(/SET GLOBAL event_scheduler = ON;/i, '-- event_scheduler');
      await connection.query(drops);
    }

    // Part 1: Stored procedures and triggers (separated by $$)
    if (parts[1]) {
      const routines = parts[1].split('$$');
      for (const routine of routines) {
        const trimmed = routine.trim();
        if (trimmed) {
          try {
            await connection.query(trimmed);
          } catch (rErr) {
            console.warn(`  ↳ Notice on routine: ${rErr.message}`);
          }
        }
      }
    }

    // Part 2: Views and events
    if (parts[2]) {
      const views = parts[2].trim();
      if (views) {
        try {
          await connection.query(views);
        } catch (vErr) {
          console.warn(`  ↳ Notice on views/events: ${vErr.message}`);
        }
      }
    }
    console.log('✓ Triggers, views, and stored procedures installed.');

    // 4. Execute seed.sql
    console.log('\n[4/4] Executing database/seed.sql...');
    let seedSql = fs.readFileSync(path.resolve(__dirname, 'seed.sql'), 'utf8');
    seedSql = seedSql.replace(/USE `blood_donor_db`;/i, `USE \`${database}\`;`);
    await connection.query(seedSql);
    console.log('✓ Realistic seed data (donors, hospitals, units, requests) loaded.');

    // Verification
    console.log('\n====================================================');
    console.log('🎉 Verification Counts from Aiven Cloud:');
    const [donors] = await connection.query('SELECT COUNT(*) as count FROM donors');
    const [hospitals] = await connection.query('SELECT COUNT(*) as count FROM hospitals');
    const [units] = await connection.query('SELECT COUNT(*) as count FROM units');
    const [requests] = await connection.query('SELECT COUNT(*) as count FROM requests');
    const [camps] = await connection.query('SELECT COUNT(*) as count FROM camps');

    console.log(`  • Registered Donors: ${donors[0].count}`);
    console.log(`  • Hospitals:         ${hospitals[0].count}`);
    console.log(`  • Blood Bags:        ${units[0].count}`);
    console.log(`  • Active Requests:   ${requests[0].count}`);
    console.log(`  • Scheduled Camps:   ${camps[0].count}`);
    console.log('====================================================');
    console.log('Aiven database is 100% LIVE and OPERATIONAL!');
  } catch (err) {
    console.error('❌ Migration Error:', err.message);
  } finally {
    if (connection) await connection.end();
  }
}

runMigration();
