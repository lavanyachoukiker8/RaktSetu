import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '';

export const http = axios.create({ baseURL, timeout: 8000 });

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('rs_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * Call the real backend if VITE_API_URL is set; otherwise (or if the server
 * can't be reached at all) run the mock implementation so the app works standalone.
 * Server error responses ({ message }) are re-thrown so the UI can toast them.
 */
export async function call(config, mockFn) {
  if (!baseURL) throw new Error('VITE_API_URL is not set – backend unavailable');
  try {
    const res = await http(config);
    return res.data;
  } catch (e) {
    if (!e.response) return mockFn(); // network failure → fall back to mock data
    throw e;
  }
}
