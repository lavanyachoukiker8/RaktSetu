// api/auth.js
// Vercel serverless function handling authentication (login & registration)
import pool from './db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { loginSchema, registerDonorSchema, registerHospitalSchema } from './utils/validation.js';

export default async function handler(req, res) {
  try {
    const { method } = req;
    if (method === 'POST') {
      // Determine sub‑action via URL path (Vercel maps file name, so we use query param "action")
      const action = req.query.action;
      if (action === 'login') {
        const parsed = loginSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ message: 'Invalid login payload', errors: parsed.error.errors });
        }
        const { email, password } = parsed.data;
        const [rows] = await pool.execute('SELECT id, password_hash, role_id FROM users WHERE email = ?', [email]);
        if (!rows.length) return res.status(401).json({ message: 'Invalid credentials' });
        const user = rows[0];
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) return res.status(401).json({ message: 'Invalid credentials' });
        // Resolve role name
        const [roleRows] = await pool.execute('SELECT name FROM roles WHERE id = ?', [user.role_id]);
        const role = roleRows[0]?.name || 'donor';
        const token = jwt.sign({ id: user.id, role }, process.env.JWT_SECRET, { expiresIn: '1h' });
        return res.status(200).json({ token });
      }

      // Registration – differentiate donor vs hospital via "type" field
      const { type } = req.body;
      if (type === 'donor') {
        const parsed = registerDonorSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ message: 'Invalid donor registration', errors: parsed.error.errors });
        }
        const { name, email, password, bloodGroup, dob, locationId } = parsed.data;
        const passwordHash = await bcrypt.hash(password, 10);
        // Get role id for donor
        const [roleRows] = await pool.execute("SELECT id FROM roles WHERE name='donor'");
        const roleId = roleRows[0].id;
        // Insert user
        const [uRes] = await pool.execute(
          'INSERT INTO users (email, password_hash, role_id) VALUES (?, ?, ?)',
          [email, passwordHash, roleId]
        );
        const userId = uRes.insertId;
        // Insert donor profile (generate UUID for donor id)
        const donorId = require('crypto').randomUUID();
        await pool.execute(
          `INSERT INTO donors (id, name, gender, dob, phone, email, blood_group, city, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [donorId, name, 'Other', dob, '', email, bloodGroup, 'Unknown']
        );
        // Link user to donor (optional – not used in schema but placeholder)
        await pool.execute('UPDATE users SET donor_id = ? WHERE id = ?', [donorId, userId]);
        const token = jwt.sign({ id: userId, role: 'donor' }, process.env.JWT_SECRET, { expiresIn: '1h' });
        return res.status(201).json({ token });
      }

      if (type === 'hospital') {
        const parsed = registerHospitalSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ message: 'Invalid hospital registration', errors: parsed.error.errors });
        }
        const { name, email, password, address, locationId } = parsed.data;
        const passwordHash = await bcrypt.hash(password, 10);
        const [roleRows] = await pool.execute("SELECT id FROM roles WHERE name='hospital'");
        const roleId = roleRows[0].id;
        const [uRes] = await pool.execute(
          'INSERT INTO users (email, password_hash, role_id) VALUES (?, ?, ?)',
          [email, passwordHash, roleId]
        );
        const userId = uRes.insertId;
        const hospitalId = require('crypto').randomUUID();
        await pool.execute(
          `INSERT INTO hospitals (id, name, city, address, status, license, phone, email, contact_person, created_at)
           VALUES (?, ?, ?, ?, 'PENDING', '', '', ?, ?, NOW())`,
          [hospitalId, name, 'Unknown', address, email, email, 'Contact']
        );
        await pool.execute('UPDATE users SET hospital_id = ? WHERE id = ?', [hospitalId, userId]);
        const token = jwt.sign({ id: userId, role: 'hospital' }, process.env.JWT_SECRET, { expiresIn: '1h' });
        return res.status(201).json({ token });
      }

      return res.status(400).json({ message: 'Invalid action or missing type' });
    }
    // Unsupported method
    return res.status(405).json({ message: 'Method not allowed' });
  } catch (e) {
    console.error('Auth handler error:', e);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
