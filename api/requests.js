// api/requests.js
// Serverless functions for emergency blood requests
import pool from './db.js';
import { verifyToken, requireRole } from './middleware/auth.js';
import { requestCreateSchema, paginationSchema } from './utils/validation.js';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const asyncHandler = fn => async (req, res) => {
  try {
    await fn(req, res);
  } catch (e) {
    console.error('Requests handler error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/requests – create a new emergency request (hospital role)
export const createRequest = asyncHandler(async (req, res) => {
  await verifyToken(req, res, async () => {
    requireRole('hospital')(req, res, async () => {
      const parsed = requestCreateSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: 'Invalid payload', errors: parsed.error.errors });
      const { hospitalId, bloodGroup, unitsNeeded, deadline } = parsed.data;
      const requestId = uuidv4();
      // For simplicity store hospital name & city via joins – placeholder values
      const [hospitalRows] = await pool.execute('SELECT name, city FROM hospitals WHERE id = ?', [hospitalId]);
      if (!hospitalRows.length) return res.status(404).json({ message: 'Hospital not found' });
      const hospital = hospitalRows[0];
      await pool.execute(
        `INSERT INTO requests (id, hospital_id, hospital_name, city, patient_name, blood_group, units_needed, urgency, status, required_by, contact_person, phone, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'NORMAL', 'OPEN', ?, ?, ?, ?)`,
        [
          requestId,
          hospitalId,
          hospital.name,
          hospital.city,
          'Unknown Patient', // patient name could be supplied later
          bloodGroup,
          unitsNeeded,
          deadline,
          'Contact Person', // placeholder
          '0000000000', // placeholder phone
          ''
        ]
      );
      res.status(201).json({ requestId });
    });
  });
});

// GET /api/requests – list requests (admin can see all, hospital sees own, donor sees open)
export const listRequests = asyncHandler(async (req, res) => {
  await verifyToken(req, res, async () => {
    const parsed = paginationSchema.safeParse(req.query);
    const page = parsed.success && parsed.data.page ? parseInt(parsed.data.page) : 1;
    const limit = parsed.success && parsed.data.limit ? parseInt(parsed.data.limit) : 20;
    const offset = (page - 1) * limit;
    let sql = 'SELECT * FROM requests';
    const params = [];
    if (req.user.role === 'hospital') {
      sql += ' WHERE hospital_id = ?';
      params.push(req.user.id);
    } else if (req.user.role === 'donor') {
      sql += " WHERE status = 'OPEN'";
    }
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    const [rows] = await pool.execute(sql, params);
    res.status(200).json({ page, limit, requests: rows });
  });
});

// GET /api/requests/:id – get a single request (authorized users only)
export const getRequest = asyncHandler(async (req, res) => {
  await verifyToken(req, res, async () => {
    const requestId = req.query.id;
    if (!requestId) return res.status(400).json({ message: 'Missing request id' });
    const [rows] = await pool.execute('SELECT * FROM requests WHERE id = ?', [requestId]);
    if (!rows.length) return res.status(404).json({ message: 'Request not found' });
    const request = rows[0];
    // Authorization: donor can see only open requests, hospital can see own, admin any
    if (req.user.role === 'donor' && request.status !== 'OPEN') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (req.user.role === 'hospital' && request.hospital_id !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    res.status(200).json(request);
  });
});

// PATCH /api/requests/:id/status – admin or hospital can change status (e.g., cancel, fulfill)
export const updateStatus = asyncHandler(async (req, res) => {
  await verifyToken(req, res, async () => {
    const requestId = req.query.id;
    const { status } = req.body;
    const statusEnum = z.enum(['OPEN', 'PARTIAL', 'FULFILLED', 'CANCELLED']).safeParse(status);
    if (!requestId || !statusEnum.success) return res.status(400).json({ message: 'Invalid id or status' });
    // Hospital can cancel its own request; admin can set any status
    if (req.user.role === 'hospital') {
      const [rows] = await pool.execute('SELECT hospital_id FROM requests WHERE id = ?', [requestId]);
      if (!rows.length) return res.status(404).json({ message: 'Request not found' });
      if (rows[0].hospital_id !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    await pool.execute('UPDATE requests SET status = ? WHERE id = ?', [status, requestId]);
    res.status(200).json({ message: 'Status updated' });
  });
});

// POST /api/requests/:id/notify – record a notification (store in request_notified table)
export const notifyDonors = asyncHandler(async (req, res) => {
  await verifyToken(req, res, async () => {
    requireRole('admin', 'hospital')(req, res, async () => {
      const requestId = req.query.id;
      const { donorIds } = req.body; // array of donor UUIDs
      if (!Array.isArray(donorIds) || !requestId) return res.status(400).json({ message: 'Invalid payload' });
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        for (const donorId of donorIds) {
          await conn.execute(
            'INSERT IGNORE INTO request_notified (request_id, donor_id) VALUES (?, ?)',
            [requestId, donorId]
          );
        }
        await conn.commit();
        res.status(200).json({ message: 'Donors notified' });
      } catch (e) {
        await conn.rollback();
        throw e;
      } finally {
        conn.release();
      }
    });
  });
});

// POST /api/requests/:id/cancel – cancel request (hospital only)
export const cancelRequest = asyncHandler(async (req, res) => {
  await verifyToken(req, res, async () => {
    requireRole('hospital')(req, res, async () => {
      const requestId = req.query.id;
      if (!requestId) return res.status(400).json({ message: 'Missing request id' });
      const [rows] = await pool.execute('SELECT hospital_id FROM requests WHERE id = ?', [requestId]);
      if (!rows.length) return res.status(404).json({ message: 'Request not found' });
      if (rows[0].hospital_id !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
      await pool.execute('UPDATE requests SET status = "CANCELLED" WHERE id = ?', [requestId]);
      res.status(200).json({ message: 'Request cancelled' });
    });
  });
});

// Export based on action query param
export default async (req, res) => {
  const action = req.query.action;
  if (action === 'create') return createRequest(req, res);
  if (action === 'list') return listRequests(req, res);
  if (action === 'get') return getRequest(req, res);
  if (action === 'status') return updateStatus(req, res);
  if (action === 'notify') return notifyDonors(req, res);
  if (action === 'cancel') return cancelRequest(req, res);
  res.status(404).json({ message: 'Request action not found' });
};
