import { useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { MapPin, Clock, Droplet, ShieldCheck, Siren } from 'lucide-react';
import { api } from '../api';
import useFetch from '../hooks/useFetch';
import { FormSelect } from '../components/Forms';
import { BloodGroupBadge, UrgencyChip } from '../components/Chips';
import { ListSkeleton, EmptyState } from '../components/Feedback';
import { BLOOD_GROUPS, CITIES, URGENCIES, donorGroupsFor } from '../utils/constants';
import { timeAgo } from '../utils/helpers';

export default function FindBlood() {
  const [sp, setSp] = useSearchParams();
  const group = sp.get('group') || '';
  const city = sp.get('city') || '';
  const urgency = sp.get('urgency') || '';
  const set = (k) => (e) => {
    const n = new URLSearchParams(sp);
    e.target.value ? n.set(k, e.target.value) : n.delete(k);
    setSp(n, { replace: true });
  };

  const inv = useFetch(() => api.getInventory({ city: city || undefined }), [city]);
  const reqs = useFetch(() => api.getRequests({ urgency: urgency || undefined, city: city || undefined }), [urgency, city]);
  const donors = useFetch(() => api.countDonors({ group: group || undefined, city: city || undefined }), [group, city]);

  const results = useMemo(() => {
    const open = (reqs.data || []).filter((r) => r.status === 'OPEN' || r.status === 'PARTIAL');
    return (inv.data || [])
      .map((h) => {
        const groups = h?.groups || [];
        const exact = group ? groups.find((g) => g.group === group)?.units || 0 : groups.reduce((s, g) => s + g.units, 0);
        const compat = group ? groups.filter((g) => donorGroupsFor(group).includes(g.group) && g.group !== group).reduce((s, g) => s + g.units, 0) : 0;
        const hospReqs = open.filter((r) => r.hospitalId === h.hospitalId);
        return { ...h, exact, compat, hospReqs };
      })
      .filter((h) => (urgency ? h.hospReqs.length > 0 : true))
      .sort((a, b) => b.exact - a.exact);
  }, [inv.data, reqs.data, group, urgency]);

  return (
    <div className="container-page py-10">
      <h1 className="text-3xl font-extrabold">Find blood</h1>
      <p className="muted mb-6">Search verified hospital stock by blood group and city. Donor phone numbers are never shown publicly, to protect their privacy.</p>

      <div className="card mb-6 grid gap-4 p-4 sm:grid-cols-3">
        <FormSelect label="Blood group" placeholder="Any group" options={BLOOD_GROUPS} value={group} onChange={set('group')} />
        <FormSelect label="City" placeholder="Any city" options={CITIES} value={city} onChange={set('city')} />
        <FormSelect label="Urgency (hospitals with open requests)" placeholder="Any urgency" options={URGENCIES.map((u) => ({ value: u, label: u[0] + u.slice(1).toLowerCase() }))} value={urgency} onChange={set('urgency')} />
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-300 bg-red-100 p-4">
        <p className="flex items-start gap-2 text-sm font-semibold text-red-900">
          <ShieldCheck size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          {donors.loading ? 'Checking donors…' : `${donors.data?.count ?? 0} eligible, available donor(s) ${group ? `compatible with ${group}` : ''} ${city ? `in ${city}` : 'across all cities'}. Contact details are shared only after a donor accepts a request.`}
        </p>
        <Link to="/emergency" className="btn-primary btn-sm"><Siren size={14} aria-hidden="true" /> Raise a request</Link>
      </div>

      {inv.loading ? <ListSkeleton count={6} h="h-48" /> : results.length === 0 ? (
        <EmptyState title="No hospitals match" message="Try removing a filter or choosing a different city. You can also raise an emergency request." action={<Link to="/emergency" className="btn-primary">Raise emergency request</Link>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {results.map((h) => (
            <article key={h.hospitalId} className="card lift p-5 animate-fade-in">
              <h2 className="font-bold text-red-950">{h.hospitalName}</h2>
              <p className="muted flex items-center gap-1 text-sm"><MapPin size={14} aria-hidden="true" /> {h.city}</p>
              <div className="mt-4 flex items-center gap-3">
                {group && <BloodGroupBadge group={group} size="lg" />}
                <div>
                  <p className="flex items-center gap-1 text-2xl font-extrabold"><Droplet size={18} className="text-red-600" aria-hidden="true" /> {h.exact}</p>
                  <p className="muted text-xs">{group ? 'units available' : 'units, all groups'}</p>
                </div>
                {group && h.compat > 0 && <p className="muted ml-auto text-right text-xs">+{h.compat} compatible<br />units</p>}
              </div>
              {h.exact === 0 && <p className="mt-2 rounded-lg bg-red-100 px-2 py-1 text-xs font-bold text-red-800">Out of stock for this group</p>}
              {h.hospReqs.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs"><span className="font-semibold">Open requests:</span>{[...new Set(h.hospReqs.map((r) => r.urgency))].map((u) => <UrgencyChip key={u} urgency={u} />)}</div>
              )}
              <p className="muted mt-3 flex items-center gap-1 border-t border-red-100 pt-3 text-xs"><Clock size={12} aria-hidden="true" /> Updated {timeAgo(h.updatedAt)}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
