export const DAY = 86400000;
export const cn = (...a) => a.filter(Boolean).join(' ');

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
export const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '—';

export const daysSince = (d) => (d ? Math.floor((Date.now() - new Date(d).getTime()) / DAY) : Infinity);

export const timeAgo = (d) => {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const dd = Math.floor(h / 24);
  return `${dd} day${dd > 1 ? 's' : ''} ago`;
};

export const timeLeft = (d) => {
  const ms = new Date(d).getTime() - Date.now();
  if (ms <= 0) return 'Overdue';
  const h = Math.floor(ms / 3600000);
  if (h < 24) return `${h} hr left`;
  const dd = Math.floor(h / 24);
  return `${dd} day${dd > 1 ? 's' : ''} left`;
};

export const ageFromDob = (dob) => {
  if (!dob) return NaN;
  const b = new Date(dob);
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  const m = n.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && n.getDate() < b.getDate())) a--;
  return a;
};

export const toInputDate = (d = new Date()) => {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 10);
};
export const toInputDateTime = (d = new Date()) => {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 16);
};

export function downloadFile(content, filename, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

export function downloadCSV(rows, filename = 'export.csv') {
  if (!rows?.length) return false;
  const headers = Object.keys(rows[0]);
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n');
  downloadFile(csv, filename, 'text/csv;charset=utf-8');
  return true;
}

export const initials = (name = '') =>
  name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
