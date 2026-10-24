// api/camps.js
// Vercel serverless function handling Camp CRUD (list & create)

import pool from './db.js';
import { validate, campCreateSchema } from './utils/validation.js';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      // List all camps
      const [rows] = await pool.query('SELECT * FROM camps');
      res.status(200).json(rows);
      return;
    }

    if (req.method === 'POST') {
      // Create a new camp
      const data = req.body;
      const validated = validate(campCreateSchema, data);
      const { name, locationId, startDate, endDate, capacity } = validated;
      const [result] = await pool.execute(
        'INSERT INTO camps (name, location_id, start_date, end_date, capacity) VALUES (?,?,?,?,?)',
        [name, locationId, startDate, endDate, capacity]
      );
      res.status(201).json({ id: result.insertId });
      return;
    }

    // Method not allowed
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (err) {
    const status = err.status || 500;
    const message = err.message || 'Server error';
    res.status(status).json({ message });
  }
}
