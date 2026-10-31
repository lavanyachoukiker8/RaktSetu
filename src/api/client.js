import axios from 'axios';

// When running with Vite proxy or configured backend URL
const baseURL = import.meta.env.VITE_API_URL || '';

export const http = axios.create({ baseURL, timeout: 10000 });

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
