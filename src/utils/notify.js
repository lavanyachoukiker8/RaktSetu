import toast from 'react-hot-toast';

export const errMsg = (e) => e?.response?.data?.message || e?.message || 'Something went wrong. Please try again.';

/**
 * Run an async action and surface success / error as a toast.
 * Backend errors shaped { message } are shown verbatim.
 * Returns { ok, data, error } so callers can branch without try/catch.
 */
export async function attempt(fn, { success, prominent = false } = {}) {
  try {
    const data = await fn();
    if (success) toast.success(success);
    return { ok: true, data };
  } catch (e) {
    const message = errMsg(e);
    if (prominent) {
      toast.error(message, {
        duration: 7000,
        style: {
          background: '#B71C2C',
          color: '#fff',
          fontWeight: 600,
          padding: '16px 20px',
          maxWidth: 480,
          border: '2px solid #6B0F1A',
        },
        iconTheme: { primary: '#fff', secondary: '#B71C2C' },
      });
    } else {
      toast.error(message);
    }
    return { ok: false, error: message };
  }
}
