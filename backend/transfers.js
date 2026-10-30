// api/transfers.js
// Inter-hospital stock transfers handler
import pool from './db.js';

export default async function handler(req, res) {
  try {
    const { method, query, body } = req;

    if (method === 'GET') {
      const { hospitalId } = query;
      let sql = `SELECT t.id, t.source_hospital_id AS fromHospitalId, h1.name AS fromName,
                        t.dest_hospital_id AS toHospitalId, h2.name AS toName,
                        u.blood_group AS \`group\`, 1 AS units, t.status, t.requested_at AS at, t.notes
                 FROM transfers t
                 LEFT JOIN hospitals h1 ON t.source_hospital_id = h1.id
                 LEFT JOIN hospitals h2 ON t.dest_hospital_id = h2.id
                 LEFT JOIN units u ON t.unit_id = u.id
                 WHERE 1=1`;
      const params = [];
      if (hospitalId) {
        sql += ' AND (t.source_hospital_id = ? OR t.dest_hospital_id = ?)';
        params.push(hospitalId, hospitalId);
      }
      sql += ' ORDER BY t.requested_at DESC';

      const [rows] = await pool.execute(sql, params);
      return res.json(rows);
    }

    if (method === 'POST') {
      const { fromHospitalId, toHospitalId, group, units, notes } = body;
      const [availableUnits] = await pool.execute(
        `SELECT id FROM units
         WHERE hospital_id = ? AND blood_group = ? AND status = 'AVAILABLE' AND expiry > NOW()
         LIMIT 1`,
        [fromHospitalId, group]
      );

      if (!availableUnits.length) {
        return res.status(400).json({ message: 'No available units to transfer' });
      }

      const unitId = availableUnits[0].id;
      const transferId = `tf-${crypto.randomUUID().slice(0, 8)}`;

      await pool.execute(
        `INSERT INTO transfers (id, source_hospital_id, dest_hospital_id, unit_id, status, requested_at, completed_at, notes)
         VALUES (?, ?, ?, ?, 'COMPLETED', NOW(), NOW(), ?)`,
        [transferId, fromHospitalId, toHospitalId, unitId, notes || 'Direct transfer']
      );

      await pool.execute('UPDATE units SET hospital_id = ? WHERE id = ?', [toHospitalId, unitId]);

      return res.status(201).json({ id: transferId, status: 'COMPLETED' });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (err) {
    console.error('Transfers handler error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
}
