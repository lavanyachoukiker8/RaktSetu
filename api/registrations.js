// api/registrations.js
// Endpoint for registering a donor to a camp (capacity check)

import pool from './db.js';
import { validate, campRegisterSchema } from './utils/validation.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const data = req.body;
    const { donorId } = validate(campRegisterSchema, data);

    // Expect campId as query param
    const campId = Number(req.query.campId);
    if (!campId) {
      return res.status(400).json({ message: 'campId query parameter required' });
    }

    // Check capacity
    const [[camp]] = await pool.execute('SELECT capacity, (SELECT COUNT(*) FROM camp_registrations WHERE camp_id = ?) AS registered FROM camps WHERE id = ?', [campId, campId]);
    if (!camp) return res.status(404).json({ message: 'Camp not found' });
    if (camp.registered >= camp.capacity) {
      return res.status(409).json({ message: 'Camp is full' });
    }

    // Insert registration
    await pool.execute('INSERT INTO camp_registrations (camp_id, donor_id) VALUES (?, ?)', [campId, donorId]);
    res.status(201).json({ message: 'Registration successful' });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Server error' });
  }
}
