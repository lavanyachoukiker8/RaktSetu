// api/db.js
// MySQL connection pool using mysql2/promise
// Supports both local MySQL and Aiven Cloud MySQL with SSL/TLS
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Automatically load .env if not already loaded into process.env
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...vals] = trimmed.split('=');
      const val = vals.join('=').trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = val;
      }
    }
  }
}

// Locate CA certificate if present (for Aiven TLS)
const caCertPath = path.resolve(__dirname, '../certs/ca.pem');
let sslConfig = undefined;

// Prefer MYSQL_* (Aiven) over DB_* if MYSQL_HOST is set to Aiven
const host = (process.env.MYSQL_HOST && process.env.MYSQL_HOST.includes('aivencloud.com'))
  ? process.env.MYSQL_HOST
  : (process.env.DB_HOST || '127.0.0.1');

const port = Number(
  (process.env.MYSQL_HOST && process.env.MYSQL_HOST.includes('aivencloud.com'))
    ? (process.env.MYSQL_PORT || 15435)
    : (process.env.DB_PORT || 3306)
);

const user = (process.env.MYSQL_HOST && process.env.MYSQL_HOST.includes('aivencloud.com'))
  ? (process.env.MYSQL_USER || 'avnadmin')
  : (process.env.DB_USER || 'root');

const password = (process.env.MYSQL_HOST && process.env.MYSQL_HOST.includes('aivencloud.com'))
  ? process.env.MYSQL_PASSWORD
  : (process.env.DB_PASSWORD || '');

const database = (process.env.MYSQL_HOST && process.env.MYSQL_HOST.includes('aivencloud.com'))
  ? (process.env.MYSQL_DATABASE || 'defaultdb')
  : (process.env.DB_NAME || 'blood_donor_db');

const isAiven = host.includes('aivencloud.com') || process.env.DB_SSL === 'true';

if (isAiven && fs.existsSync(caCertPath)) {
  try {
    sslConfig = {
      ca: fs.readFileSync(caCertPath),
      rejectUnauthorized: false,
    };
  } catch (err) {
    console.warn('Warning: Could not read certs/ca.pem:', err.message);
    sslConfig = { rejectUnauthorized: false };
  }
}

const pool = mysql.createPool({
  host,
  port,
  user,
  password,
  database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: sslConfig,
});

export default pool;
