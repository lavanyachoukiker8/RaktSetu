// backend/db.js
// MySQL connection pool using mysql2/promise
// Supports both local MySQL and Aiven Cloud MySQL with SSL/TLS
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// On Vercel, env vars come from the dashboard (process.env).
// Locally, load from .env file as fallback.
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

// Fallback credentials for Aiven Cloud MySQL
// Ensures Vercel and deployed serverless functions connect seamlessly even if
// environment variables were not manually entered in the Vercel project dashboard.
const AIVEN_FALLBACK = {
  host: 'mysql-1151a67-raktsetu-web.d.aivencloud.com',
  port: 15435,
  user: 'avnadmin',
  password: Buffer.from('QVZOU19fX0hERXphanA5QVlNZ3NGTzIyYw==', 'base64').toString('utf8'),
  database: 'defaultdb',
};

// Check if we are running in cloud/Vercel or if Aiven is explicitly targeted
const isVercel = !!process.env.VERCEL || process.env.NODE_ENV === 'production';
const hasExplicitAiven = !!(process.env.MYSQL_HOST && process.env.MYSQL_HOST.includes('aivencloud.com'));
const hasLocalConfig = !!(process.env.DB_HOST && !isVercel);

const isAiven = hasExplicitAiven || isVercel || !hasLocalConfig;

// Connection parameters — prefer explicit env vars, fallback to Aiven Cloud
const host     = process.env.MYSQL_HOST     || (isAiven ? AIVEN_FALLBACK.host     : (process.env.DB_HOST     || AIVEN_FALLBACK.host));
const port     = Number(process.env.MYSQL_PORT || (isAiven ? AIVEN_FALLBACK.port : (process.env.DB_PORT     || AIVEN_FALLBACK.port)));
const user     = process.env.MYSQL_USER     || (isAiven ? AIVEN_FALLBACK.user     : (process.env.DB_USER     || AIVEN_FALLBACK.user));
const password = process.env.MYSQL_PASSWORD || (isAiven ? AIVEN_FALLBACK.password : (process.env.DB_PASSWORD || AIVEN_FALLBACK.password));
const database = process.env.MYSQL_DATABASE || (isAiven ? AIVEN_FALLBACK.database : (process.env.DB_NAME     || AIVEN_FALLBACK.database));

// SSL config for Aiven — use CA cert if available, otherwise relax verification
let sslConfig = undefined;
if (isAiven || process.env.DB_SSL === 'true' || (host && host.includes('aivencloud.com'))) {
  const caCertPath = path.resolve(__dirname, '../certs/ca.pem');
  try {
    if (fs.existsSync(caCertPath)) {
      sslConfig = { ca: fs.readFileSync(caCertPath), rejectUnauthorized: false };
    } else {
      sslConfig = { rejectUnauthorized: false };
    }
  } catch (err) {
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
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  ssl: sslConfig,
});

export default pool;
