// api/camps/[id]/register.js
// Vercel serverless function handling donor registration for a specific camp.
// URL: /api/camps/:id/register

import pool from '../../../db.js';
import { verifyToken } from '../../../middleware/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // Authenticate the donor (or admin) – only donors can register
  await verifyToken(req, res, async () => {
    const campId = Number(req.query.id);
    const { donorId } = req.body;
    if (!campId) return res.status(400).json({ message: 'Missing camp id in URL' });
    if (!donorId) return res.status(400).json({ message: 'donorId required in body' });

    // Verify capacity
    const [[camp]] = await pool.execute(
      `SELECT capacity, (SELECT COUNT(*) FROM camp_registrations WHERE camp_id = ?) AS registered FROM camps WHERE id = ?`,
      [campId, campId]
    );
    if (!camp) return res.status(404).json({ message: 'Camp not found' });
    if (camp.registered >= camp.capacity) {
      return res.status(409).json({ message: 'Camp is full' });
    }

    // Create registration
    await pool.execute('INSERT INTO camp_registrations (camp_id, donor_id) VALUES (?, ?)', [campId, donorId]);
    res.status(201).json({ message: 'Registration successful' });
  });
}
