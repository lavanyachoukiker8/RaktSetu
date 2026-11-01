import axios from 'axios';

// In production on Vercel or deployed domains:
// API routes are on the same domain (/api/*). Never hardcode localhost in production builds.
const rawUrl = (import.meta.env.VITE_API_URL || '').trim();
const isLocalhost = rawUrl.includes('localhost') || rawUrl.includes('127.0.0.1');

// If in production or if URL points to localhost, use relative '' so requests go to the deployed origin (/api/*)
// Also strip any trailing '/api' because all endpoints in src/api/index.js already begin with '/api/'
let baseURL = '';
if (import.meta.env.PROD || isLocalhost) {
  baseURL = isLocalhost ? '' : rawUrl.replace(/\/api\/?$/, '');
} else {
  baseURL = rawUrl.replace(/\/api\/?$/, '');
}

export const http = axios.create({ baseURL, timeout: 15000 });

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('rs_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * Execute real API calls to the MySQL backend.
 * Re-throws server error responses so that UI toasts display proper validation/auth messages.
 */
export async function call(config, fallbackFn) {
  try {
    const res = await http(config);
    return res.data;
  } catch (e) {
    if (e.response) {
      // Real backend responded with an error (e.g. 400, 401, 403, 409)
      throw e;
    }
    // If backend is completely unreachable and a fallback is provided, use it
    if (fallbackFn) {
      console.warn('Backend server unreachable; using fallback:', e.message);
      const fallbackResult = await fallbackFn();
      if (fallbackResult !== null && fallbackResult !== undefined) {
        return fallbackResult;
      }
      throw new Error('Server unreachable. Please verify that the backend is running.');
    }
    throw e;
  }
}
