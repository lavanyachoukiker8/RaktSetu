import { MapPin, Clock, CalendarDays, Building2, Users, Phone, Droplet } from 'lucide-react';
import { BloodGroupBadge, UrgencyChip, StatusChip } from './Chips';
import { fmtDate, timeAgo, timeLeft, fmtDateTime } from '../utils/helpers';

export function RequestCard({ r, actions, compact = false }) {
  return (
    <article className="card lift p-4 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <BloodGroupBadge group={r.group} size="lg" />
          <div>
            <p className="font-bold text-red-950">{r.units} unit{r.units > 1 ? 's' : ''} needed</p>
            <p className="muted flex items-center gap-1 text-xs">
              <Clock size={12} aria-hidden="true" /> {timeAgo(r.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <UrgencyChip urgency={r.urgency} />
          {!compact && r.status && <StatusChip status={r.status} />}
        </div>
      </div>
      <div className="mt-3 space-y-1 text-sm text-red-900">
        <p className="flex items-center gap-2">
          <Building2 size={14} aria-hidden="true" /> <span className="font-semibold">{r.hospitalName}</span>
        </p>
        <p className="flex items-center gap-2">
          <MapPin size={14} aria-hidden="true" /> {r.city}
          {r.area && r.area !== r.city ? <span className="muted">· {r.area}</span> : null}
        </p>
        <p className="flex items-center gap-2">
          <CalendarDays size={14} aria-hidden="true" /> Needed by {fmtDateTime(r.requiredBy)} <span className="muted">({timeLeft(r.requiredBy)})</span>
        </p>
        {r.phone && (
          <p className="flex items-center gap-2 font-semibold">
            <Phone size={14} aria-hidden="true" /> {r.contactPerson} · {r.phone}
          </p>
        )}
      </div>
      {actions && <div className="mt-4 flex flex-wrap gap-2">{actions}</div>}
    </article>
  );
}

export function CampCard({ camp, onOpen, onRegister, registered, busy }) {
  const past = new Date(camp.date) < new Date();
  return (
    <article className="card lift flex flex-col p-5 animate-fade-in">
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-12 w-12 flex-col items-center justify-center rounded-xl bg-red-600 text-white" aria-hidden="true">
          <span className="text-lg font-extrabold leading-none">{new Date(camp.date).getDate()}</span>
          <span className="text-[10px] font-bold uppercase">{new Date(camp.date).toLocaleString('en-IN', { month: 'short' })}</span>
        </div>
        {past && <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-800">Completed</span>}
      </div>
      <h3 className="mt-3 text-lg font-bold text-red-950">{camp.name}</h3>
      <p className="muted text-sm">by {camp.organizer}</p>
      <div className="mt-2 space-y-1 text-sm text-red-900">
        <p className="flex items-center gap-2"><MapPin size={14} aria-hidden="true" /> {camp.venue}, {camp.city}</p>
        <p className="flex items-center gap-2"><CalendarDays size={14} aria-hidden="true" /> {fmtDate(camp.date)}</p>
        <p className="flex items-center gap-2"><Users size={14} aria-hidden="true" /> {camp.registrationCount ?? camp.registrations?.length ?? 0} registered</p>
      </div>
      <div className="mt-4 flex gap-2 pt-1">
        <button type="button" className="btn-outline flex-1" onClick={() => onOpen?.(camp)}>Details</button>
        {!past && (
          <button type="button" className="btn-primary flex-1" disabled={registered || busy} onClick={() => onRegister?.(camp)}>
            {registered ? 'Registered' : 'Register for camp'}
          </button>
        )}
      </div>
    </article>
  );
}

export function DonorCard({ d, rank, actions }) {
  return (
    <div className="card flex items-center justify-between gap-3 p-4">
      <div className="flex items-center gap-3">
        {rank && <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-sm font-extrabold text-red-800">{rank}</span>}
        <BloodGroupBadge group={d.group} />
        <div>
          <p className="font-bold text-red-950">{d.name}</p>
          <p className="muted flex items-center gap-1 text-xs"><MapPin size={12} aria-hidden="true" /> {d.city}</p>
        </div>
      </div>
      {d.count !== undefined && (
        <span className="inline-flex items-center gap-1 text-sm font-bold text-red-800"><Droplet size={14} aria-hidden="true" /> {d.count}</span>
      )}
      {actions}
    </div>
  );
}
