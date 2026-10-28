// api/index.js
// Vercel serverless function entrypoint that handles all /api/* requests
// by delegating directly to the Express app.

import app from '../server.js';

export default function handler(req, res) {
  return app(req, res);
}
