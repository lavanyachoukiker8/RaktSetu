// api/middleware/auth.js
// JWT Bearer authentication middleware supporting both Express and Serverless functions

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'raktsetu_super_secret_jwt_key_2026';

export function extractToken(req) {
  const authHeader = req.headers?.authorization || req.headers?.Authorization || '';
  if (!authHeader) return null;
  return authHeader.replace(/^Bearer\s+/i, '').trim();
}

export function verifyToken(req, res, next) {
  // If called directly with token string
  if (typeof req === 'string') {
    try {
      return jwt.verify(req, JWT_SECRET);
    } catch {
      return null;
    }
  }

  // Express middleware signature (req, res, next)
  const token = extractToken(req);
  if (!token) {
    if (res && typeof res.status === 'function') {
      return res.status(401).json({ message: 'Missing Authorization token' });
    }
    throw { status: 401, message: 'Missing Authorization token' };
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    if (typeof next === 'function') {
      return next();
    }
    return payload;
  } catch (err) {
    if (res && typeof res.status === 'function') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    throw { status: 401, message: 'Invalid or expired token' };
  }
}

export function optionalToken(req, res, next) {
  const token = extractToken(req);
  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch {
      // Ignore invalid optional token
    }
  }
  if (typeof next === 'function') next();
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access forbidden: insufficient role permissions' });
    }
    if (typeof next === 'function') {
      return next();
    }
  };
}

export function protect(handler) {
  return async (req, res) => {
    try {
      const user = verifyToken(req, res);
      req.user = user;
      return await handler(req, res);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message || 'Auth error' });
    }
  };
}

export default {
  verifyToken,
  optionalToken,
  requireRole,
  protect,
};
