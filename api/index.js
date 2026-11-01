// api/index.js
// Vercel serverless function entrypoint that handles all /api/* requests
// by delegating directly to the Express app.

import app from '../server.js';

export default function handler(req, res) {
  // Ensure the URL matches Express route definitions (/api/*)
  const matched = req.headers['x-matched-path'] || req.headers['x-vercel-matched-path'] || '';
  if (matched && matched.startsWith('/api') && req.url !== matched) {
    req.url = matched;
  } else if (req.url && !req.url.startsWith('/api') && req.url !== '/') {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  return app(req, res);
}
