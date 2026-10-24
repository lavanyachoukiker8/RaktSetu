// api/hospitals.js
// Serverless functions for hospital operations (profile, inventory, status)
import pool from './db.js';
import { verifyToken, requireRole } from './middleware/auth.js';
import { paginationSchema } from './utils/validation.js';
import { z } from 'zod';

const asyncHandler = fn => async (req, res) => {
  try {
    await fn(req, res);
  } catch (e) {
    console.error('Hospital handler error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/hospitals/:id – retrieve hospital profile (self or admin)
export const getHospital = asyncHandler(async (req, res) => {
  await verifyToken(req, res, async () => {
    const hospitalId = req.query.id;
    if (!hospitalId) return res.status(400).json({ message: 'Missing hospital id' });
    // Allow admin or the hospital itself (user role hospital and linked id)
    if (req.user.role !== 'admin' && req.user.role !== 'hospital') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const [rows] = await pool.execute('SELECT * FROM hospitals WHERE id = ?', [hospitalId]);
    if (!rows.length) return res.status(404).json({ message: 'Hospital not found' });
    res.status(200).json(rows[0]);
  });
});

// PUT /api/hospitals/:id/status – update hospital status (admin only)
export const setHospitalStatus = asyncHandler(async (req, res) => {
  await verifyToken(req, res, async () => {
    requireRole('admin')(req, res, async () => {
      const hospitalId = req.query.id;
      const { status } = req.body;
      const statusEnum = z.enum(['PENDING', 'APPROVED', 'REJECTED']).safeParse(status);
      if (!hospitalId || !statusEnum.success) {
        return res.status(400).json({ message: 'Invalid hospital id or status' });
      }
      await pool.execute('UPDATE hospitals SET status = ? WHERE id = ?', [status, hospitalId]);
      res.status(200).json({ message: 'Status updated' });
    });
  });
});

// GET /api/hospitals/:id/inventory – list blood unit counts per group (available only)
export const getInventory = asyncHandler(async (req, res) => {
  await verifyToken(req, res, async () => {
    const hospitalId = req.query.id;
    if (!hospitalId) return res.status(400).json({ message: 'Missing hospital id' });
    const [rows] = await pool.execute(
      `SELECT blood_group, COUNT(*) AS available_units
       FROM units
       WHERE hospital_id = ? AND status = 'AVAILABLE'
       GROUP BY blood_group`,
      [hospitalId]
    );
    res.status(200).json(rows);
  });
});

// PUT /api/hospitals/:id/threshold – set low‑stock threshold per blood group (admin or hospital)
export const setThreshold = asyncHandler(async (req, res) => {
  await verifyToken(req, res, async () => {
    const hospitalId = req.query.id;
    const { bloodGroup, threshold } = req.body;
    const schema = z.object({
      bloodGroup: z.string().regex(/^(A|B|AB|O)[+-]$/),
      threshold: z.number().int().min(1).max(100)
    }).safeParse({ bloodGroup, threshold });
    if (!hospitalId || !schema.success) {
      return res.status(400).json({ message: 'Invalid data' });
    }
    await pool.execute(
      `INSERT INTO inventory_thresholds (hospital_id, blood_group, threshold)
       VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE threshold = VALUES(threshold)`,
      [hospitalId, bloodGroup, threshold]
    );
    res.status(200).json({ message: 'Threshold set' });
  });
});

// Export handler based on query action
export default async (req, res) => {
  const action = req.query.action;
  if (action === 'profile') return getHospital(req, res);
  if (action === 'status') return setHospitalStatus(req, res);
  if (action === 'inventory') return getInventory(req, res);
  if (action === 'threshold') return setThreshold(req, res);
  res.status(404).json({ message: 'Hospital action not found' });
};
