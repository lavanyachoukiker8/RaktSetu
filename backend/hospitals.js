// api/hospitals.js
// Hospital API endpoints handler
import pool from './db.js';
import bcrypt from 'bcrypt';

export default async function handler(req, res) {
  try {
    const { method, query, body } = req;
    const action = query.action;

    // POST /api/hospitals/register
    if (method === 'POST' && (action === 'register' || req.url?.includes('register'))) {
      const { name, license, city, address, phone, email, contactPerson, password } = body;
      if (!name || !license || !city || !address || !phone || !email || !contactPerson || !password) {
        return res.status(400).json({ message: 'All fields are required' });
      }

      const hospitalId = `hosp-${crypto.randomUUID().slice(0, 8)}`;
      const passwordHash = await bcrypt.hash(password, 10);

      const [roles] = await pool.execute("SELECT id FROM roles WHERE name = 'hospital'");
      const roleId = roles[0].id;

      await pool.execute(
        `INSERT INTO hospitals (id, name, city, address, status, license, phone, email, contact_person, created_at)
         VALUES (?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, NOW())`,
        [hospitalId, name, city, address, license, phone, email, contactPerson]
      );

      await pool.execute(
        `INSERT INTO users (username, email, phone, password_hash, role_id, hospital_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [email, email, phone, passwordHash, roleId, hospitalId]
      );

      return res.status(201).json({ ok: true, id: hospitalId });
    }

    // GET /api/hospitals
    if (method === 'GET') {
      const { status, city } = query;
      let sql = 'SELECT * FROM hospitals WHERE 1=1';
      const params = [];
      if (status) { sql += ' AND status = ?'; params.push(status); }
      if (city) { sql += ' AND city = ?'; params.push(city); }
      sql += ' ORDER BY created_at DESC';

      const [rows] = await pool.execute(sql, params);
      return res.json(rows);
    }

    return res.status(404).json({ message: 'Not found' });
  } catch (err) {
    console.error('Hospitals handler error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
}
