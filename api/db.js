// api/db.js
// MySQL connection pool using mysql2/promise
// Reads connection details from environment variables.
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3307),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'blood_donor_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // For Aiven TLS you may need to add `ssl: { rejectUnauthorized: true }`
});

export default pool;
