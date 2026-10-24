// api/notifications.js
// Vercel function for user notifications (list & mark as read)
import pool from './db.js';
import { verifyToken } from './middleware/auth.js';

export default async function handler(req, res) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Missing token' });
    const user = verifyToken(token);
    const userId = user.sub || user.id;

    if (req.method === 'GET') {
      const [rows] = await pool.query(
        'SELECT id, type, payload, read_at, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      );
      return res.status(200).json(rows);
    }
    if (req.method === 'PATCH') {
      const notifId = Number(req.query.id);
      if (!notifId) return res.status(400).json({ message: 'Notification id required' });
      await pool.execute('UPDATE notifications SET read_at = NOW() WHERE id = ? AND user_id = ?', [notifId, userId]);
      return res.status(200).json({ message: 'Marked as read' });
    }
    res.setHeader('Allow', ['GET', 'PATCH']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Server error' });
  }
}
