// api/requests.js
// Requests API endpoints handler
import pool from './db.js';

export default async function handler(req, res) {
  try {
    const { method, query, body } = req;

    if (method === 'GET') {
      const { status, urgency, group, city, hospitalId } = query;
      let sql = 'SELECT * FROM requests WHERE 1=1';
      const params = [];

      if (status) { sql += ' AND status = ?'; params.push(status); }
      if (urgency) { sql += ' AND urgency = ?'; params.push(urgency); }
      if (group) { sql += ' AND blood_group = ?'; params.push(group); }
      if (city) { sql += ' AND city = ?'; params.push(city); }
      if (hospitalId) { sql += ' AND hospital_id = ?'; params.push(hospitalId); }
      sql += ' ORDER BY created_at DESC';

      const [rows] = await pool.execute(sql, params);
      return res.json(rows);
    }

    if (method === 'POST') {
      const { hospitalId, hospitalName, city, patientName, group, units, urgency, requiredBy, contactPerson, phone, notes } = body;
      const requestId = `req-${crypto.randomUUID().slice(0, 8)}`;
      await pool.execute(
        `INSERT INTO requests (id, hospital_id, hospital_name, city, patient_name, blood_group, units_needed, urgency, status, required_by, contact_person, phone, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?, ?, ?, NOW())`,
        [requestId, hospitalId || null, hospitalName || 'Emergency', city, patientName, group, units, urgency || 'NORMAL', new Date(requiredBy), contactPerson, phone, notes || null]
      );
      return res.status(201).json({ id: requestId });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (err) {
    console.error('Requests handler error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
}
