// api/camps.js
// Camps API endpoints handler
import pool from './db.js';

export default async function handler(req, res) {
  try {
    const { method, query, body } = req;

    if (method === 'GET') {
      const { city, from } = query;
      let sql = `SELECT c.*, h.name AS organizer_name, COUNT(cr.id) AS registration_count
                 FROM camps c
                 LEFT JOIN hospitals h ON c.organizer_hospital_id = h.id
                 LEFT JOIN camp_registrations cr ON c.id = cr.camp_id
                 WHERE 1=1`;
      const params = [];

      if (city) { sql += ' AND c.city = ?'; params.push(city); }
      if (from) { sql += ' AND c.date >= ?'; params.push(new Date(from)); }
      sql += ' GROUP BY c.id ORDER BY c.date ASC';

      const [rows] = await pool.execute(sql, params);
      const result = rows.map((c) => ({
        id: c.id,
        name: c.name,
        organizer: c.organizer_name || 'RaktSetu Community',
        city: c.city,
        venue: c.address,
        date: c.date,
        targetUnits: c.target_units,
        unitsCollected: c.collected_units,
        registrationCount: Number(c.registration_count || 0),
      }));
      return res.json(result);
    }

    if (method === 'POST') {
      const { name, city, venue, date, unitsCollected } = body;
      const campId = `camp-${crypto.randomUUID().slice(0, 8)}`;
      await pool.execute(
        `INSERT INTO camps (id, name, city, date, address, collected_units, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [campId, name, city, new Date(date), venue || city, Number(unitsCollected || 0)]
      );
      return res.status(201).json({ id: campId, name, city, venue, date });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (err) {
    console.error('Camps handler error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
}
