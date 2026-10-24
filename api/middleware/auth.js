// api/middleware/auth.js
// JWT Bearer authentication middleware for Vercel serverless functions

import jwt from 'jsonwebtoken';

export function verifyToken(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) throw { status: 401, message: 'Missing Authorization token' };
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return payload; // contains userId, role, etc.
  } catch (err) {
    throw { status: 401, message: 'Invalid or expired token' };
  }
}

export function protect(handler) {
  return async (req, res) => {
    try {
      const user = verifyToken(req);
      req.user = user;
      return await handler(req, res);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || 'Auth error' });
    }
  };
}
