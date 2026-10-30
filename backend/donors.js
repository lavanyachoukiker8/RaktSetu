// api/donors.js
// Donor API endpoints handler
import pool from './db.js';
import { verifyToken } from './middleware/auth.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'raktsetu_super_secret_jwt_key_2026';
const MIN_GAP_DAYS = 90;

export default async function handler(req, res) {
  try {
    const { method, query } = req;
    const action = query.action;

    // POST /api/donors/register
    if (method === 'POST' && (action === 'register' || req.url?.includes('register'))) {
      const { name, dob, gender, phone, email, group, city, area, weight, available, password } = req.body;
      if (!name || !dob || !phone || !group || !city || !password) {
        return res.status(400).json({ message: 'Required fields are missing' });
      }

      const donorId = `donor-${crypto.randomUUID().slice(0, 8)}`;
      const passwordHash = await bcrypt.hash(password, 10);

      const [roles] = await pool.execute("SELECT id FROM roles WHERE name = 'donor'");
      const roleId = roles[0].id;

      let g = 'Other';
      if (gender === 'M' || gender === 'Male') g = 'Male';
      else if (gender === 'F' || gender === 'Female') g = 'Female';

      await pool.execute(
        `INSERT INTO donors (id, name, gender, dob, phone, email, blood_group, city, area, weight_kg, available, active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, NOW())`,
        [donorId, name, g, dob, phone, email || null, group, city, area || null, Number(weight || 55), available !== false]
      );

      const [userRes] = await pool.execute(
        `INSERT INTO users (username, email, phone, password_hash, role_id, donor_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [phone, email || null, phone, passwordHash, roleId, donorId]
      );

      const token = jwt.sign({ id: userRes.insertId, role: 'donor', donorId, name, city }, JWT_SECRET, { expiresIn: '7d' });
      return res.status(201).json({ token, user: { id: donorId, role: 'donor', name, donorId, city } });
    }

    // GET /api/donors
    if (method === 'GET' && !query.id && action !== 'leaderboard' && action !== 'count') {
      const { group, city, available, search } = query;
      let sql = 'SELECT * FROM donors WHERE 1=1';
      const params = [];

      if (group) { sql += ' AND blood_group = ?'; params.push(group); }
      if (city) { sql += ' AND city = ?'; params.push(city); }
      if (available === 'true') sql += ' AND available = TRUE';
      if (available === 'false') sql += ' AND available = FALSE';
      if (search) {
        sql += ' AND (LOWER(name) LIKE ? OR phone LIKE ?)';
        params.push(`%${search.toLowerCase()}%`, `%${search}%`);
      }
      sql += ' ORDER BY created_at DESC';

      const [rows] = await pool.execute(sql, params);
      return res.json(rows);
    }

    // GET /api/donors/leaderboard
    if (method === 'GET' && action === 'leaderboard') {
      const [rows] = await pool.execute(
        `SELECT id, name, city, blood_group AS \`group\`, donation_count AS count
         FROM donors WHERE active = TRUE AND donation_count > 0
         ORDER BY donation_count DESC LIMIT 10`
      );
      return res.json(rows);
    }

    return res.status(404).json({ message: 'Action not found' });
  } catch (err) {
    console.error('Donors handler error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
}
