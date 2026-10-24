// api/transfers.js
// Serverless functions for inter‑hospital blood unit transfers
import pool from './db.js';
import { verifyToken, requireRole } from './middleware/auth.js';
import { transferCreateSchema, paginationSchema } from './utils/validation.js';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const asyncHandler = fn => async (req, res) => {
  try {
    await fn(req, res);
  } catch (e) {
    console.error('Transfers handler error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/transfers – create a transfer (admin or hospital)
export const createTransfer = asyncHandler(async (req, res) => {
  await verifyToken(req, res, async () => {
    // Hospital can create a transfer for its own stock, admin any
    const allowedRoles = req.user.role === 'admin' ? ['admin'] : ['hospital'];
    requireRole(...allowedRoles)(req, res, async () => {
      const parsed = transferCreateSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: 'Invalid payload', errors: parsed.error.errors });
      const { fromHospitalId, toHospitalId, bloodGroup, units } = parsed.data;
      // Simple validation: ensure enough AVAILABLE units exist at source
      const [availRows] = await pool.execute(
        `SELECT id FROM units WHERE hospital_id = ? AND blood_group = ? AND status = 'AVAILABLE' LIMIT ?`,
        [fromHospitalId, bloodGroup, units]
      );
      if (availRows.length < units) return res.status(400).json({ message: 'Not enough units available at source' });

      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        // Reserve each unit and create transfer record per unit
        for (let i = 0; i < units; i++) {
          const unit = availRows[i];
          await conn.execute('UPDATE units SET status = ? WHERE id = ?', ['RESERVED', unit.id]);
          const transferId = uuidv4();
          await conn.execute(
            `INSERT INTO transfers (id, source_hospital_id, dest_hospital_id, unit_id, status, requested_at)
             VALUES (?, ?, ?, ?, 'REQUESTED', NOW())`,
            [transferId, fromHospitalId, toHospitalId, unit.id]
          );
        }
        await conn.commit();
        res.status(201).json({ message: 'Transfer created', unitsTransferred: units });
      } catch (e) {
        await conn.rollback();
        throw e;
      } finally {
        conn.release();
      }
    });
  });
});

// GET /api/transfers – list transfers (admin sees all, hospital sees related)
export const listTransfers = asyncHandler(async (req, res) => {
  await verifyToken(req, res, async () => {
    const parsed = paginationSchema.safeParse(req.query);
    const page = parsed.success && parsed.data.page ? parseInt(parsed.data.page) : 1;
    const limit = parsed.success && parsed.data.limit ? parseInt(parsed.data.limit) : 20;
    const offset = (page - 1) * limit;
    let sql = 'SELECT * FROM transfers';
    const params = [];
    if (req.user.role === 'hospital') {
      sql += ' WHERE source_hospital_id = ? OR dest_hospital_id = ?';
      params.push(req.user.id, req.user.id);
    }
    sql += ' ORDER BY requested_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    const [rows] = await pool.execute(sql, params);
    res.status(200).json({ page, limit, transfers: rows });
  });
});

export default async (req, res) => {
  const action = req.query.action;
  if (action === 'create') return createTransfer(req, res);
  if (action === 'list') return listTransfers(req, res);
  res.status(404).json({ message: 'Transfer action not found' });
};
