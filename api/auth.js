// api/auth.js
// Authentication handler for login, donor registration, and hospital registration
import pool from './db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'raktsetu_super_secret_jwt_key_2026';

export default async function handler(req, res) {
  try {
    const { method } = req;
    if (method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({ message: `Method ${method} Not Allowed` });
    }

    const action = req.query.action || req.body.action || (req.url && req.url.includes('login') ? 'login' : null);

    // 1. LOGIN
    if (action === 'login' || req.body.identifier) {
      const { identifier, password, role } = req.body;
      if (!identifier || !password) {
        return res.status(400).json({ message: 'Identifier and password are required' });
      }

      const cleanId = String(identifier).trim().toLowerCase();
      const [users] = await pool.execute(
        `SELECT u.id, u.username, u.email, u.phone, u.password_hash, u.role_id, u.donor_id, u.hospital_id, r.name AS role_name
         FROM users u
         JOIN roles r ON u.role_id = r.id
         WHERE (LOWER(u.username) = ? OR LOWER(u.email) = ? OR u.phone = ?)`,
        [cleanId, cleanId, cleanId]
      );

      if (!users.length) {
        return res.status(401).json({ message: 'Invalid username or password for the selected role.' });
      }

      const user = users[0];
      if (role && user.role_name !== role) {
        return res.status(401).json({ message: `Account exists but is not registered as a ${role}` });
      }

      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        return res.status(401).json({ message: 'Invalid username or password for the selected role.' });
      }

      if (user.role_name === 'donor') {
        const [donors] = await pool.execute('SELECT * FROM donors WHERE id = ?', [user.donor_id]);
        if (!donors.length) return res.status(404).json({ message: 'Donor profile not found' });
        const d = donors[0];
        if (!d.active) {
          return res.status(403).json({ message: 'This donor account has been deactivated. Please contact support.' });
        }
        const token = jwt.sign(
          { id: user.id, role: 'donor', donorId: d.id, name: d.name, city: d.city },
          JWT_SECRET,
          { expiresIn: '7d' }
        );
        return res.json({ token, user: { id: d.id, role: 'donor', name: d.name, donorId: d.id, city: d.city } });
      }

      if (user.role_name === 'hospital') {
        const [hospitals] = await pool.execute('SELECT * FROM hospitals WHERE id = ?', [user.hospital_id]);
        if (!hospitals.length) return res.status(404).json({ message: 'Hospital profile not found' });
        const h = hospitals[0];
        if (h.status === 'PENDING') {
          return res.status(403).json({ message: 'Your hospital is awaiting admin verification. You will be able to log in once approved.' });
        }
        if (h.status === 'REJECTED') {
          return res.status(403).json({ message: 'Your hospital registration was rejected. Please contact RaktSetu support.' });
        }
        const token = jwt.sign(
          { id: user.id, role: 'hospital', hospitalId: h.id, name: h.name, city: h.city },
          JWT_SECRET,
          { expiresIn: '7d' }
        );
        return res.json({ token, user: { id: h.id, role: 'hospital', name: h.name, hospitalId: h.id, city: h.city } });
      }

      const token = jwt.sign({ id: user.id, role: 'admin', name: user.username }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ token, user: { id: `A${user.id}`, role: 'admin', name: user.username || 'Admin' } });
    }

    return res.status(400).json({ message: 'Invalid action or request body' });
  } catch (err) {
    console.error('Auth handler error:', err);
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
}
