import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Award, Download, Droplet, Phone, CheckCircle2, XCircle, Medal, Trophy } from 'lucide-react';
import { api } from '../../api';
import useFetch from '../../hooks/useFetch';
import { useAuth } from '../../context/AuthContext';
import { CountdownRing, StatCard } from '../../components/Widgets';
import { RequestCard, CampCard, DonorCard } from '../../components/Cards';
import { ToggleSwitch, FormInput, FormSelect } from '../../components/Forms';
import { ListSkeleton, Skeleton, EmptyState } from '../../components/Feedback';
import { ConfirmDialog } from '../../components/Modal';
import Modal from '../../components/Modal';
import DataTable from '../../components/DataTable';
import { BloodGroupBadge } from '../../components/Chips';
import { BADGES, CITIES, PREFERRED_TIMES } from '../../utils/constants';
import { attempt } from '../../utils/notify';
import { fmtDate, downloadFile } from '../../utils/helpers';

const Title = ({ children, sub }) => (
  <div className="mb-5">
    <h1 className="text-2xl font-extrabold">{children}</h1>
    {sub && <p className="muted text-sm">{sub}</p>}
  </div>
);

/* ---------------- Overview ---------------- */
export function DonorOverview() {
  const { user } = useAuth();
  const id = user.donorId;
  const elig = useFetch(() => api.getEligibility(id), [id]);
  const reqs = useFetch(() => api.getDonorRequests(id), [id]);
  const [busy, setBusy] = useState(false);
  const e = elig.data;

  const toggle = async (val) => {
    setBusy(true);
    const r = await attempt(() => api.setAvailability(id, val), { success: val ? 'You are now available for requests.' : 'You will not receive requests while unavailable.' });
    setBusy(false);
    if (r.ok) elig.setData({ ...e, available: val });
  };

  if (elig.loading) return <div className="space-y-4"><Skeleton className="h-56" /><ListSkeleton count={3} h="h-28" /></div>;
  if (!e) return <EmptyState title="Could not load your profile" message="Please refresh the page." />;

  const total = e.totalDonations;
  const nextBadge = BADGES.find((b) => total < b.min);
  const prevMin = [...BADGES].reverse().find((b) => total >= b.min)?.min || 0;
  const pct = nextBadge ? ((total - prevMin) / (nextBadge.min - prevMin)) * 100 : 100;
  const latest = (reqs.data || []).find((r) => !r.myResponse);

  return (
    <>
      <Title sub="Your donor snapshot">Welcome, {user.name.split(' ')[0]}</Title>
      <div className="grid gap-5 lg:grid-cols-3">
        <section className="glass flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:text-left lg:col-span-2" aria-label="Eligibility">
          <CountdownRing daysLeft={e.daysRemaining} />
          <div className="flex-1">
            <h2 className="text-xl font-bold">{e.eligible ? 'You are eligible to donate' : `Eligible again in ${e.daysRemaining} days`}</h2>
            <p className="muted text-sm">
              {e.lastDonation ? `Last donation: ${fmtDate(e.lastDonation)}.` : 'You have not donated yet.'} {!e.eligible && `Next eligible date: ${fmtDate(e.nextDate)}.`}
            </p>
            <div className="mt-4"><ToggleSwitch checked={e.available} onChange={toggle} disabled={busy} label={e.available ? 'Available for requests' : 'Currently unavailable'} /></div>
          </div>
        </section>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
          <StatCard icon={Droplet} label="Total donations" value={e.totalDonations} />
          <StatCard icon={Award} label="Units donated" value={e.totalUnits} />
        </div>
      </div>

      <section className="card mt-5 p-5" aria-label="Badge progress">
        <div className="mb-2 flex items-center justify-between text-sm">
          <h2 className="font-bold">{nextBadge ? `Next badge: ${nextBadge.name}` : 'You have earned every badge!'}</h2>
          {nextBadge && <span className="muted">{total} / {nextBadge.min} donations</span>}
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-red-100" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-red-600 transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
      </section>

      <section className="mt-5" aria-label="Latest request">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Latest incoming request</h2>
          <Link to="/donor/requests" className="btn-ghost btn-sm">See all →</Link>
        </div>
        {reqs.loading ? <Skeleton className="h-40" /> : latest ? (
          <RequestCard r={latest} actions={<Link to="/donor/requests" className="btn-primary btn-sm">Respond</Link>} />
        ) : <div className="card"><EmptyState title="No new requests" message="We will notify you when a hospital in your city needs your blood group." /></div>}
      </section>
    </>
  );
}

/* ---------------- Incoming requests ---------------- */
export function DonorRequests() {
  const { user } = useAuth();
  const id = user.donorId;
  const reqs = useFetch(() => api.getDonorRequests(id), [id]);
  const [dlg, setDlg] = useState(null); // { r, accept }
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState(null);

  const confirm = async () => {
    setBusy(true);
    const res = await attempt(() => api.respond(dlg.r.id, id, dlg.accept));
    setBusy(false);
    if (res.ok) {
      if (dlg.accept) setRevealed({ ...res.data, id: dlg.r.id });
      else await attempt(async () => true, { success: 'Request declined.' });
      setDlg(null);
      reqs.reload();
    }
  };

  return (
    <>
      <Title sub="Hospitals in your city that need your blood group">Incoming requests</Title>
      {reqs.loading ? <ListSkeleton count={4} h="h-52" cols="grid-cols-1 xl:grid-cols-2" /> : (reqs.data || []).length === 0 ? (
        <div className="card"><EmptyState title="No open requests right now" message="Thank you for being ready. We will alert you when someone nearby needs your blood group." /></div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {reqs.data.map((r) => (
            <RequestCard key={r.id} r={r} actions={
              r.myResponse === 'ACCEPTED' ? (
                <p className="flex items-center gap-2 rounded-xl bg-red-100 px-3 py-2 text-sm font-bold text-red-900"><CheckCircle2 size={16} /> You accepted. Please contact the hospital.</p>
              ) : (
                <>
                  <button type="button" className="btn-primary btn-sm" disabled={!r.eligibleByDeadline} onClick={() => setDlg({ r, accept: true })}><CheckCircle2 size={14} /> Accept</button>
                  <button type="button" className="btn-outline btn-sm" onClick={() => setDlg({ r, accept: false })}><XCircle size={14} /> Decline</button>
                  {!r.eligibleByDeadline && <p className="w-full text-xs font-semibold text-red-800">You will not be eligible before this deadline.</p>}
                  {r.directlyNotified && <p className="w-full text-xs text-red-900/80">The hospital notified you directly.</p>}
                </>
              )
            } />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!dlg} onClose={() => setDlg(null)} onConfirm={confirm} loading={busy} danger={dlg && !dlg.accept}
        title={dlg?.accept ? 'Accept this request?' : 'Decline this request?'}
        confirmText={dlg?.accept ? 'Yes, I will donate' : 'Decline'}
        message={dlg?.accept ? `You agree to donate ${dlg?.r.group}-compatible blood at ${dlg?.r.hospitalName} by ${dlg && fmtDate(dlg.r.requiredBy)}. The hospital's contact number will be revealed after you accept.` : 'This request will be removed from your list. It will not affect your eligibility.'}
      />
      <Modal open={!!revealed} onClose={() => setRevealed(null)} title="Thank you, hero!" size="sm"
        footer={<button type="button" className="btn-primary" onClick={() => setRevealed(null)}>Done</button>}>
        {revealed && (
          <div className="text-center">
            <CheckCircle2 size={44} className="mx-auto text-red-700" aria-hidden="true" />
            <p className="mt-2 text-sm">Please contact {revealed.hospitalName}:</p>
            <a href={`tel:${revealed.phone}`} className="mt-2 inline-flex items-center gap-2 rounded-xl bg-red-100 px-4 py-3 text-lg font-extrabold text-red-900"><Phone size={18} /> {revealed.contactPerson} · {revealed.phone}</a>
          </div>
        )}
      </Modal>
    </>
  );
}

/* ---------------- History ---------------- */
const certificate = (d, name) => `<!doctype html><html><head><meta charset="utf-8"><title>Certificate</title>
<style>body{font-family:Georgia,serif;background:#FFF1F2;padding:40px}.c{max-width:760px;margin:auto;background:#fff;border:8px double #B71C2C;padding:48px;text-align:center;color:#3D0810}
h1{color:#B71C2C;font-size:38px;margin:0}h2{font-size:30px;margin:24px 0 8px;color:#6B0F1A}p{font-size:17px;line-height:1.6}.s{margin-top:40px;color:#8E1422;font-size:14px}</style></head>
<body><div class="c"><h1>RaktSetu</h1><p>Certificate of Appreciation</p><p>This certifies that</p><h2>${name}</h2>
<p>generously donated <b>${d.units} unit(s)</b> of blood (${d.group}) on <b>${fmtDate(d.date)}</b> at <b>${d.hospitalName}</b>${d.campName ? ` as part of <b>${d.campName}</b>` : ''}.</p>
<p>Your gift can save up to three lives. Thank you for being a bridge of hope.</p><p class="s">Certificate ID: ${d.id} · Issued by RaktSetu</p></div></body></html>`;

export function DonorHistory() {
  const { user } = useAuth();
  const hist = useFetch(() => api.getDonorDonations(user.donorId), [user.donorId]);
  return (
    <>
      <Title sub="Every donation you have made">Donation history</Title>
      <DataTable
        loading={hist.loading} rows={hist.data || []} searchKeys={['hospitalName', 'campName', 'id']} searchPlaceholder="Search hospital or camp"
        emptyTitle="No donations yet" emptyText="Once a hospital records your donation it will appear here."
        columns={[
          { key: 'date', label: 'Date', render: (r) => fmtDate(r.date), sortValue: (r) => new Date(r.date) },
          { key: 'hospitalName', label: 'Hospital' },
          { key: 'units', label: 'Units' },
          { key: 'campName', label: 'Camp / request', render: (r) => r.campName || (r.requestId ? `Request ${r.requestId}` : 'Walk-in') },
          { key: 'cert', label: 'Certificate', sortable: false, render: (r) => (
            <button type="button" className="btn-outline btn-sm" onClick={() => downloadFile(certificate(r, user.name), `RaktSetu-certificate-${r.id}.html`, 'text/html')}>
              <Download size={14} aria-hidden="true" /> Download
            </button>
          ) },
        ]}
      />
    </>
  );
}

/* ---------------- Badges ---------------- */
const BADGE_TONE = {
  bronze: 'from-red-200 to-red-300 text-red-900',
  silver: 'from-red-400 to-red-500 text-white',
  gold: 'from-red-700 to-red-900 text-white',
};
export function DonorBadges() {
  const { user } = useAuth();
  const elig = useFetch(() => api.getEligibility(user.donorId), [user.donorId]);
  const board = useFetch(() => api.getLeaderboard());
  const total = elig.data?.totalDonations ?? 0;
  return (
    <>
      <Title sub="Earn badges as you donate">Badges &amp; leaderboard</Title>
      <div className="grid gap-4 sm:grid-cols-3">
        {BADGES.map((b) => {
          const earned = total >= b.min;
          return (
            <div key={b.key} className={`card p-5 text-center ${earned ? '' : 'opacity-70'}`}>
              <div className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br shadow-soft ring-4 ring-red-100 ${BADGE_TONE[b.key]}`}>
                <Medal size={44} aria-hidden="true" />
              </div>
              <h2 className="mt-3 text-lg font-extrabold">{b.name}</h2>
              <p className="muted text-sm">{b.desc}</p>
              <p className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-bold ${earned ? 'bg-red-700 text-white' : 'bg-red-100 text-red-800'}`}>
                {earned ? 'Earned' : `${b.min - total} more to go`}
              </p>
            </div>
          );
        })}
      </div>
      <h2 className="mb-3 mt-8 flex items-center gap-2 text-lg font-bold"><Trophy size={20} className="text-red-700" aria-hidden="true" /> Top donors</h2>
      {board.loading ? <ListSkeleton count={5} cols="grid-cols-1" h="h-16" /> : (
        <div className="space-y-2">
          {(board.data || []).map((d, i) => <DonorCard key={d.id} d={d} rank={i + 1} />)}
        </div>
      )}
    </>
  );
}

/* ---------------- Profile ---------------- */
export function DonorProfile() {
  const { user } = useAuth();
  const id = user.donorId;
  const prof = useFetch(() => api.getDonor(id), [id]);
  const [busy, setBusy] = useState(false);
  const d = prof.data;

  const form = useForm({ values: d ? { name: d.name, phone: d.phone, email: d.email, city: d.city, preferredTime: d.preferredTime } : undefined });
  const pw = useForm();
  const [avail, setAvail] = useState(null);
  const available = avail ?? d?.available;

  const save = async (v) => {
    setBusy(true);
    const r = await attempt(() => api.updateDonor(id, { ...v, available }), { success: 'Profile updated.' });
    setBusy(false);
    if (r.ok) prof.reload();
  };
  const change = async (v) => {
    const r = await attempt(() => api.changePassword(id, { current: v.current, next: v.next }), { success: 'Password changed.' });
    if (r.ok) pw.reset();
  };

  if (prof.loading) return <Skeleton className="h-96" />;
  if (!d) return <EmptyState title="Profile not found" />;
  return (
    <>
      <Title sub="Keep your details current so hospitals can reach you">My profile</Title>
      <form onSubmit={form.handleSubmit(save)} className="card grid gap-4 p-5 sm:grid-cols-2" noValidate>
        <div className="flex items-center gap-3 sm:col-span-2"><BloodGroupBadge group={d.group} size="lg" /><p className="muted text-sm">Blood group cannot be changed. Contact support if it is wrong.</p></div>
        <FormInput label="Full name" error={form.formState.errors.name?.message} {...form.register('name', { required: 'Name is required' })} />
        <FormInput label="Phone" inputMode="numeric" maxLength={10} error={form.formState.errors.phone?.message} {...form.register('phone', { required: 'Phone is required', pattern: { value: /^\d{10}$/, message: 'Phone must be exactly 10 digits' } })} />
        <FormInput label="Email" type="email" {...form.register('email')} />
        <FormSelect label="City" options={CITIES} {...form.register('city')} />
        <FormSelect label="Preferred contact time" options={PREFERRED_TIMES} {...form.register('preferredTime')} />
        <div className="flex items-end"><ToggleSwitch checked={!!available} onChange={setAvail} label="Available to donate" /></div>
        <div className="sm:col-span-2"><button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button></div>
      </form>

      <h2 className="mb-3 mt-8 text-lg font-bold">Change password</h2>
      <form onSubmit={pw.handleSubmit(change)} className="card grid gap-4 p-5 sm:grid-cols-3" noValidate>
        <FormInput label="Current password" type="password" error={pw.formState.errors.current?.message} {...pw.register('current', { required: 'Required' })} />
        <FormInput label="New password" type="password" error={pw.formState.errors.next?.message} {...pw.register('next', { required: 'Required', minLength: { value: 6, message: 'At least 6 characters' } })} />
        <FormInput label="Confirm new" type="password" error={pw.formState.errors.confirm?.message} {...pw.register('confirm', { required: 'Required', validate: (x) => x === pw.getValues('next') || 'Passwords do not match' })} />
        <div className="sm:col-span-3"><button type="submit" className="btn-outline">Update password</button></div>
      </form>
    </>
  );
}

/* ---------------- Camps ---------------- */
export function DonorCamps() {
  const { user } = useAuth();
  const camps = useFetch(() => api.getCamps({ from: new Date().toISOString() }));
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(null);
  const register = async (c) => {
    setBusy(true);
    const r = await attempt(() => api.registerForCamp(c.id, user.donorId), { success: `Registered for ${c.name}!` });
    setBusy(false);
    if (r.ok) camps.reload();
  };
  return (
    <>
      <Title sub="Register for upcoming camps">Donation camps</Title>
      {camps.loading ? <ListSkeleton count={3} h="h-56" /> : (camps.data || []).length === 0 ? (
        <div className="card"><EmptyState title="No upcoming camps" message="Check back soon." /></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {camps.data.map((c) => <CampCard key={c.id} camp={c} busy={busy} registered={c.registrations?.includes(user.donorId)} onRegister={register} onOpen={setOpen} />)}
        </div>
      )}
      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.name || ''}>
        {open && <dl className="space-y-2 text-sm"><div><dt className="font-bold">Organizer</dt><dd>{open.organizer}</dd></div><div><dt className="font-bold">Date</dt><dd>{fmtDate(open.date)}</dd></div><div><dt className="font-bold">Venue</dt><dd>{open.venue}, {open.city}</dd></div></dl>}
      </Modal>
    </>
  );
}
