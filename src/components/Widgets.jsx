import { AlertTriangle, Check, Circle } from 'lucide-react';
import useCountUp from '../hooks/useCountUp';
import { BloodGroupBadge } from './Chips';

export function StatCard({ icon: Icon, label, value, hint, animate = true }) {
  const n = useCountUp(typeof value === 'number' && animate ? value : 0);
  return (
    <div className="glass lift p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-red-900/80">{label}</p>
        {Icon && (
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 text-red-700">
            <Icon size={18} aria-hidden="true" />
          </span>
        )}
      </div>
      <p className="mt-2 text-3xl font-extrabold text-red-950">{typeof value === 'number' && animate ? n.toLocaleString('en-IN') : value}</p>
      {hint && <p className="muted mt-1 text-xs">{hint}</p>}
    </div>
  );
}

export function StockTile({ group, units, low }) {
  return (
    <div className={`lift rounded-2xl border p-4 text-center ${low ? 'border-red-400 bg-red-100' : 'border-red-200 bg-white'}`}>
      <BloodGroupBadge group={group} size="lg" />
      <p className="mt-2 text-2xl font-extrabold text-red-950">{units}</p>
      <p className="muted text-xs">units available</p>
      {low && (
        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-red-700 px-2 py-0.5 text-xs font-bold text-white">
          <AlertTriangle size={12} aria-hidden="true" /> Low stock
        </span>
      )}
    </div>
  );
}

/** steps: [{ label, done, time?, note? }] */
export function Timeline({ steps }) {
  const firstPending = steps.findIndex((s) => !s.done);
  return (
    <ol className="relative space-y-5">
      {steps.map((s, i) => (
        <li key={s.label} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                s.done ? 'bg-red-700 text-white' : i === firstPending ? 'border-2 border-red-500 bg-white text-red-600' : 'border-2 border-red-200 bg-white text-red-300'
              }`}
            >
              {s.done ? <Check size={16} aria-hidden="true" /> : <Circle size={10} aria-hidden="true" />}
            </span>
            {i < steps.length - 1 && <span className={`mt-1 w-0.5 flex-1 ${s.done ? 'bg-red-600' : 'bg-red-200'}`} />}
          </div>
          <div className="pb-1">
            <p className={`text-sm font-bold ${s.done ? 'text-red-950' : 'text-red-900/60'}`}>
              {s.label} <span className="sr-only">{s.done ? '(done)' : '(pending)'}</span>
            </p>
            {s.note && <p className="muted text-xs">{s.note}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function CountdownRing({ daysLeft, total = 90, size = 150 }) {
  const r = 58;
  const c = 2 * Math.PI * r;
  const progress = daysLeft <= 0 ? 1 : (total - daysLeft) / total;
  return (
    <div className="relative" style={{ width: size, height: size }} role="img" aria-label={daysLeft <= 0 ? 'Eligible to donate' : `Eligible again in ${daysLeft} days`}>
      <svg viewBox="0 0 140 140" width={size} height={size} className="-rotate-90">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#FFE0E3" strokeWidth="12" />
        <circle cx="70" cy="70" r={r} fill="none" stroke={daysLeft <= 0 ? '#B71C2C' : '#E63946'} strokeWidth="12" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - progress)} style={{ transition: 'stroke-dashoffset .8s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {daysLeft <= 0 ? (
          <>
            <Check size={30} className="text-red-700" aria-hidden="true" />
            <span className="text-xs font-bold text-red-900">Eligible</span>
          </>
        ) : (
          <>
            <span className="text-3xl font-extrabold text-red-900">{daysLeft}</span>
            <span className="text-xs font-semibold text-red-900/80">days to go</span>
          </>
        )}
      </div>
    </div>
  );
}
