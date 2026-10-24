// api/donors.js
// Serverless functions for donor operations (profile, eligibility, history, availability)
import pool from './db.js';
import { verifyToken, requireRole } from './middleware/auth.js';
import { paginationSchema } from './utils/validation.js';
import { z } from 'zod';

// Helper to wrap async handler with error handling (Vercel expects (req, res))
const asyncHandler = fn => async (req, res) => {
  try {
    await fn(req, res);
  } catch (e) {
    console.error('Donor handler error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/donors/:id – get donor profile (restricted to self or admin)
export const getDonor = asyncHandler(async (req, res) => {
  await verifyToken(req, res, async () => {
    const donorId = req.query.id;
    if (!donorId) return res.status(400).json({ message: 'Missing donor id' });
    // Allow donor themselves or admin
    if (req.user.role !== 'admin' && req.user.id !== donorId) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const [rows] = await pool.execute('SELECT * FROM donors WHERE id = ?', [donorId]);
    if (!rows.length) return res.status(404).json({ message: 'Donor not found' });
    res.status(200).json(rows[0]);
  });
});

// PUT /api/donors/:id – update donor profile (self only)
export const updateDonor = asyncHandler(async (req, res) => {
  await verifyToken(req, res, async () => {
    const donorId = req.query.id;
    if (!donorId) return res.status(400).json({ message: 'Missing donor id' });
    if (req.user.role !== 'donor' || req.user.id !== donorId) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const allowed = z.object({
      name: z.string().optional(),
      phone: z.string().regex(/^\d{10}$/).optional(),
      email: z.string().email().optional(),
      blood_group: z.string().regex(/^(A|B|AB|O)[+-]$/).optional(),
      city: z.string().optional(),
      area: z.string().optional()
    }).safeParse(req.body);
    if (!allowed.success) return res.status(400).json({ message: 'Invalid fields', errors: allowed.error.errors });
    const fields = [];
    const values = [];
    for (const [key, val] of Object.entries(allowed.data)) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
    if (!fields.length) return res.status(400).json({ message: 'No update fields provided' });
    values.push(donorId);
    const sql = `UPDATE donors SET ${fields.join(', ')} WHERE id = ?`;
    await pool.execute(sql, values);
    res.status(200).json({ message: 'Donor updated' });
  });
});

// GET /api/donors/:id/eligibility – simple eligibility check (age, last donation >90 days, weight etc.)
export const getEligibility = asyncHandler(async (req, res) => {
  await verifyToken(req, res, async () => {
    const donorId = req.query.id;
    if (!donorId) return res.status(400).json({ message: 'Missing donor id' });
    const [rows] = await pool.execute('SELECT dob, last_donation, weight_kg FROM donors WHERE id = ?', [donorId]);
    if (!rows.length) return res.status(404).json({ message: 'Donor not found' });
    const donor = rows[0];
    const now = new Date();
    const age = now.getFullYear() - new Date(donor.dob).getFullYear();
    const lastDonation = donor.last_donation ? new Date(donor.last_donation) : null;
    const daysSince = lastDonation ? Math.floor((now - lastDonation) / (1000 * 60 * 60 * 24)) : null;
    const eligible = age >= 18 && age <= 65 && (!lastDonation || daysSince >= 90) && donor.weight_kg >= 50;
    res.status(200).json({ eligible, age, daysSinceLastDonation: daysSince, weightKg: donor.weight_kg });
  });
});

// GET /api/donors/:id/donations – paginated donation history
export const getDonations = asyncHandler(async (req, res) => {
  await verifyToken(req, res, async () => {
    const donorId = req.query.id;
    if (!donorId) return res.status(400).json({ message: 'Missing donor id' });
    const parsed = paginationSchema.safeParse(req.query);
    const page = parsed.success && parsed.data.page ? parseInt(parsed.data.page) : 1;
    const limit = parsed.success && parsed.data.limit ? parseInt(parsed.data.limit) : 20;
    const offset = (page - 1) * limit;
    const [rows] = await pool.execute(
      'SELECT * FROM donations WHERE donor_id = ? ORDER BY collected_at DESC LIMIT ? OFFSET ?',
      [donorId, limit, offset]
    );
    res.status(200).json({ page, limit, donations: rows });
  });
});

// Export Vercel handler mapping based on query param "action"
export default async (req, res) => {
  const action = req.query.action;
  if (action === 'profile') return getDonor(req, res);
  if (action === 'update') return updateDonor(req, res);
  if (action === 'eligibility') return getEligibility(req, res);
  if (action === 'donations') return getDonations(req, res);
  res.status(404).json({ message: 'Donor action not found' });
};
