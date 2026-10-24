// api/match.js
// Serverless functions for donor‑request matching and donor responses
import pool from './db.js';
import { verifyToken, requireRole } from './middleware/auth.js';
import { z } from 'zod';

const asyncHandler = fn => async (req, res) => {
  try {
    await fn(req, res);
  } catch (e) {
    console.error('Match handler error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/match/:requestId – find eligible donors (admin or hospital can trigger)
export const findDonors = asyncHandler(async (req, res) => {
  await verifyToken(req, res, async () => {
    const requestId = req.query.requestId;
    if (!requestId) return res.status(400).json({ message: 'Missing request id' });
    // Load request details
    const [reqRows] = await pool.execute('SELECT city, blood_group, units_needed FROM requests WHERE id = ?', [requestId]);
    if (!reqRows.length) return res.status(404).json({ message: 'Request not found' });
    const { city, blood_group, units_needed } = reqRows[0];
    // Simple matching: donors in same city, matching blood group, available, active
    const [donorRows] = await pool.execute(
      `SELECT d.id, d.name, d.email, d.phone, d.blood_group
       FROM donors d
       WHERE d.city = ? AND d.blood_group = ? AND d.available = TRUE AND d.active = TRUE
       LIMIT ?`,
      [city, blood_group, units_needed]
    );
    // Insert matches into request_notified (if not already present) – use transaction
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (const donor of donorRows) {
        await conn.execute(
          'INSERT IGNORE INTO request_notified (request_id, donor_id) VALUES (?, ?)',
          [requestId, donor.id]
        );
      }
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
    res.status(200).json({ matchedDonors: donorRows });
  });
});

// POST /api/match/:requestId/respond – donor accepts/declines a request
export const respond = asyncHandler(async (req, res) => {
  await verifyToken(req, res, async () => {
    // Only donors may respond
    if (req.user.role !== 'donor') return res.status(403).json({ message: 'Only donors can respond' });
    const requestId = req.query.requestId;
    const { accept } = req.body;
    const acceptSchema = z.boolean().safeParse(accept);
    if (!requestId || !acceptSchema.success) return res.status(400).json({ message: 'Invalid payload' });
    // Ensure donor was notified for this request
    const [notifRows] = await pool.execute(
      'SELECT id FROM request_notified WHERE request_id = ? AND donor_id = ?',
      [requestId, req.user.id]
    );
    if (!notifRows.length) return res.status(403).json({ message: 'Donor not notified for this request' });
    const table = accept ? 'request_accepted' : 'request_declined';
    await pool.execute(`INSERT INTO ${table} (request_id, donor_id) VALUES (?, ?)`, [requestId, req.user.id]);
    res.status(200).json({ message: accept ? 'Accepted' : 'Declined' });
  });
});

export default async (req, res) => {
  const action = req.query.action;
  if (action === 'find') return findDonors(req, res);
  if (action === 'respond') return respond(req, res);
  res.status(404).json({ message: 'Match action not found' });
};
