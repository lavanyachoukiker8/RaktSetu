import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Siren, AlertOctagon, HeartPulse, AlertTriangle, Timer, Send, ArrowLeft, MessageCircle, Package, XCircle, Bell, Truck, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api';
import useFetch from '../../hooks/useFetch';
import { useAuth } from '../../context/AuthContext';
import { StatCard, Timeline } from '../../components/Widgets';
import RequestForm from '../../components/RequestForm';
import DataTable from '../../components/DataTable';
import { BloodGroupBadge, UrgencyChip, StatusChip } from '../../components/Chips';
import { FormInput, FormSelect } from '../../components/Forms';
import { ListSkeleton, Skeleton, EmptyState } from '../../components/Feedback';
import { ConfirmDialog } from '../../components/Modal';
import { BLOOD_GROUPS, REQUEST_STATUSES, URGENCIES } from '../../utils/constants';
import { attempt } from '../../utils/notify';
import { fmtDate, fmtDateTime, timeLeft, downloadCSV, toInputDate, DAY, daysSince } from '../../utils/helpers';

const Title = ({ children, sub, right }) => (
  <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
    <div>
      <h1 className="text-2xl font-extrabold">{children}</h1>
      {sub && <p className="muted text-sm">{sub}</p>}
    </div>
    {right}
  </div>
);

const useHospital = () => {
  const { user } = useAuth();
  const h = useFetch(() => api.getHospitals(), [user.hospitalId]);
  return { id: user.hospitalId, list: h.data || [], me: (h.data || []).find((x) => x.id === user.hospitalId) };
};

/* ---------------- Overview ---------------- */
export function HospitalOverview() {
  const { user } = useAuth();
  const hid = user.hospitalId;
  const reqs = useFetch(() => api.getRequests({ hospitalId: hid }), [hid]);
  const inv = useFetch(() => api.getInventory({ hospitalId: hid }), [hid]);
  const rep = useFetch(() => api.getMonthlyReport({ from: toInputDate(), to: toInputDate(), hospitalId: hid }), [hid]);

  const open = (reqs.data || []).filter((r) => r.status === 'OPEN' || r.status === 'PARTIAL');
  const critical = open.filter((r) => r.urgency === 'CRITICAL');
  const lowStock = inv.data?.[0]?.groups.filter((g) => g.low) || [];
  const expiring = (inv.data?.[0]?.units || []).filter((u) => u.status === 'AVAILABLE' && new Date(u.expiry) < new Date(Date.now() + 7 * DAY));

  return (
    <>
      <Title sub={user.name} right={<Link to="/hospital/create" className="btn-primary"><Siren size={16} /> New request</Link>}>Hospital overview</Title>
      {reqs.loading || inv.loading ? <ListSkeleton count={4} cols="grid-cols-2 lg:grid-cols-4" h="h-28" /> : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={Siren} label="Open requests" value={open.length} />
          <StatCard icon={AlertOctagon} label="Critical" value={critical.length} />
          <StatCard icon={HeartPulse} label="Today's donations" value={rep.data?.totalDonations ?? 0} />
          <StatCard icon={AlertTriangle} label="Low-stock alerts" value={lowStock.length} />
        </div>
      )}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="card p-5" aria-label="Low stock">
          <h2 className="mb-3 flex items-center gap-2 font-bold"><AlertTriangle size={18} className="text-red-700" /> Low-stock alerts</h2>
          {lowStock.length === 0 ? <p className="muted text-sm">All blood groups are above their thresholds.</p> : (
            <ul className="space-y-2">{lowStock.map((g) => (
              <li key={g.group} className="flex items-center justify-between rounded-xl bg-red-100 px-3 py-2">
                <BloodGroupBadge group={g.group} /><span className="text-sm font-semibold">{g.units} units <span className="muted">(min {g.threshold})</span></span>
              </li>))}</ul>
          )}
        </section>
        <section className="card p-5" aria-label="Expiring soon">
          <h2 className="mb-3 flex items-center gap-2 font-bold"><Timer size={18} className="text-red-700" /> Expiring within 7 days</h2>
          {expiring.length === 0 ? <p className="muted text-sm">No units expiring soon.</p> : (
            <ul className="max-h-60 space-y-2 overflow-y-auto">{expiring.slice(0, 10).map((u) => (
              <li key={u.id} className="flex items-center justify-between rounded-xl border border-red-200 px-3 py-2 text-sm">
                <span className="flex items-center gap-2"><BloodGroupBadge group={u.group} size="sm" /> {u.id}</span><span className="font-semibold">{fmtDate(u.expiry)}</span>
              </li>))}</ul>
          )}
        </section>
      </div>
    </>
  );
}

/* ---------------- Create request ---------------- */
export function CreateRequest() {
  const nav = useNavigate();
  const { me } = useHospital();
  return (
    <>
      <Title sub="Matching donors in your city are found instantly">Create blood request</Title>
      {me ? <RequestForm hospital={me} onCreated={(r) => nav(`/hospital/requests/${r.id}`)} /> : <Skeleton className="h-96" />}
    </>
  );
}

/* ---------------- My requests ---------------- */
export function MyRequests() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ status: '', urgency: '', group: '' });
  const reqs = useFetch(() => api.getRequests({ hospitalId: user.hospitalId }), [user.hospitalId]);
  const rows = useMemo(() => (reqs.data || []).filter((r) => (!f.status || r.status === f.status) && (!f.urgency || r.urgency === f.urgency) && (!f.group || r.group === f.group)), [reqs.data, f]);
  const sel = (k, ph, opts) => (
    <select aria-label={`Filter by ${ph}`} className="input w-auto" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })}>
      <option value="">{ph}</option>{opts.map((o) => <option key={o}>{o}</option>)}
    </select>
  );
  return (
    <>
      <Title sub="Click a row to view matches and take action" right={<Link to="/hospital/create" className="btn-primary"><Siren size={16} /> New request</Link>}>My requests</Title>
      <DataTable
        loading={reqs.loading} rows={rows} pageSize={8} searchKeys={['id', 'patientName', 'group', 'contactPerson']} searchPlaceholder="Search patient or ID"
        onRowClick={(r) => nav(`/hospital/requests/${r.id}`)} emptyTitle="No requests found" emptyText="Adjust the filters or raise a new request."
        toolbar={<>{sel('status', 'All statuses', REQUEST_STATUSES)}{sel('urgency', 'All urgencies', URGENCIES)}{sel('group', 'All groups', BLOOD_GROUPS)}</>}
        columns={[
          { key: 'id', label: 'ID' },
          { key: 'patientName', label: 'Patient' },
          { key: 'group', label: 'Group', render: (r) => <BloodGroupBadge group={r.group} size="sm" /> },
          { key: 'units', label: 'Units' },
          { key: 'urgency', label: 'Urgency', render: (r) => <UrgencyChip urgency={r.urgency} />, sortValue: (r) => URGENCIES.indexOf(r.urgency) },
          { key: 'status', label: 'Status', render: (r) => <StatusChip status={r.status} /> },
          { key: 'requiredBy', label: 'Needed by', render: (r) => fmtDateTime(r.requiredBy), sortValue: (r) => new Date(r.requiredBy) },
        ]}
      />
    </>
  );
}

/* ---------------- Request detail ---------------- */
export function RequestDetail() {
  const { id } = useParams();
  const req = useFetch(() => api.getRequest(id), [id]);
  const matches = useFetch(() => api.getMatches(id), [id]);
  const [dlg, setDlg] = useState(null);
  const [busy, setBusy] = useState(false);
  const r = req.data;

  const refresh = () => { req.reload(); matches.reload(); };
  const run = async (fn, success) => {
    setBusy(true);
    const res = await attempt(fn, { success });
    setBusy(false);
    setDlg(null);
    if (res.ok) refresh();
  };

  if (req.loading) return <Skeleton className="h-96" />;
  if (!r) return <EmptyState title="Request not found" action={<Link to="/hospital/requests" className="btn-primary">Back to requests</Link>} />;

  const closed = r.status === 'FULFILLED' || r.status === 'CANCELLED';
  const steps = [
    { label: 'Created', done: true, note: fmtDateTime(r.createdAt) },
    { label: 'Donors notified', done: r.notified.length > 0 || r.accepted.length > 0, note: `${r.notified.length} notified` },
    { label: 'Donor accepted', done: r.accepted.length > 0, note: `${r.accepted.length} accepted` },
    { label: 'Fulfilled', done: r.status === 'FULFILLED' },
    ...(r.status === 'CANCELLED' ? [{ label: 'Cancelled', done: true }] : []),
  ];
  const wa = `https://wa.me/?text=${encodeURIComponent(`🩸 URGENT BLOOD NEEDED\n${r.units} unit(s) of ${r.group} (${r.urgency}) at ${r.hospitalName}, ${r.city}.\nNeeded by ${fmtDateTime(r.requiredBy)}.\nContact: ${r.contactPerson} ${r.phone}\nPlease share. Via RaktSetu`)}`;
  const notRows = (matches.data || []).filter((m) => !m.notified);

  return (
    <>
      <Link to="/hospital/requests" className="btn-ghost btn-sm mb-3"><ArrowLeft size={14} /> All requests</Link>
      <Title sub={`Patient: ${r.patientName} · Needed by ${fmtDateTime(r.requiredBy)} (${timeLeft(r.requiredBy)})`}
        right={<div className="flex items-center gap-2"><UrgencyChip urgency={r.urgency} /><StatusChip status={r.status} /></div>}>
        Request {r.id}: {r.units} unit{r.units > 1 ? 's' : ''} of <BloodGroupBadge group={r.group} />
      </Title>

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="card p-5" aria-label="Status timeline"><h2 className="mb-4 font-bold">Status timeline</h2><Timeline steps={steps} /></section>
        <section className="card p-5 lg:col-span-2" aria-label="Actions">
          <h2 className="mb-3 font-bold">Actions</h2>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary" disabled={closed} onClick={() => setDlg('fulfill')}><Package size={16} /> Fulfill from inventory</button>
            <button type="button" className="btn-outline" disabled={closed} onClick={() => setDlg('cancel')}><XCircle size={16} /> Cancel request</button>
            <a href={wa} target="_blank" rel="noreferrer" className="btn-outline"><MessageCircle size={16} /> Share on WhatsApp</a>
          </div>
          {r.notes && <p className="muted mt-4 rounded-xl bg-red-50 p-3 text-sm"><span className="font-bold text-red-900">Notes: </span>{r.notes}</p>}
        </section>
      </div>

      <h2 className="mb-3 mt-8 text-lg font-bold">Matched donors <span className="muted text-sm font-normal">(same city · compatible · eligible · available)</span></h2>
      <DataTable
        loading={matches.loading} rows={matches.data || []} pageSize={6} searchKeys={['name', 'group', 'city']} searchPlaceholder="Search donors"
        emptyTitle="No matching donors yet" emptyText="No eligible donors are available in this city right now. Try sharing on WhatsApp or requesting a transfer."
        toolbar={<button type="button" className="btn-primary btn-sm" disabled={closed || notRows.length === 0} onClick={() => run(() => api.notify(id, {}), 'All matching donors notified.')}><Bell size={14} /> Notify all ({notRows.length})</button>}
        columns={[
          { key: 'name', label: 'Donor' },
          { key: 'group', label: 'Group', render: (m) => <BloodGroupBadge group={m.group} size="sm" /> },
          { key: 'exact', label: 'Match', render: (m) => <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${m.exact ? 'bg-red-700 text-white' : 'bg-red-100 text-red-800'}`}>{m.exact ? 'Exact match' : 'Compatible'}</span> },
          { key: 'daysSince', label: 'Days since last', render: (m) => (m.daysSince == null ? 'First-time' : `${m.daysSince} days`) },
          { key: 'city', label: 'City' },
          { key: 'phone', label: 'Contact', sortable: false, render: (m) => m.phone || <span className="muted text-xs">Hidden until accepted</span> },
          { key: 'act', label: '', sortable: false, render: (m) => m.accepted ? <StatusChip status="APPROVED" /> : (
            <button type="button" className="btn-outline btn-sm" disabled={closed || m.notified || busy} onClick={() => run(() => api.notify(id, { donorIds: [m.id] }), `${m.name} notified.`)}>
              <Send size={13} /> {m.notified ? 'Notified' : 'Notify'}
            </button>) },
        ]}
      />

      <ConfirmDialog open={dlg === 'fulfill'} onClose={() => setDlg(null)} loading={busy} confirmText="Deduct & fulfill" title="Fulfill from inventory"
        onConfirm={() => run(() => api.fulfill(id), `Request ${id} fulfilled.`)}
        message={`${r.units} unit(s) of ${r.group} will be deducted from your inventory (earliest-expiry first) and this request will be marked FULFILLED.`} />
      <ConfirmDialog open={dlg === 'cancel'} onClose={() => setDlg(null)} loading={busy} danger confirmText="Cancel request" title="Cancel this request?"
        onConfirm={() => run(() => api.cancelRequest(id), `Request ${id} cancelled.`)} message="Donors will stop receiving this request. This cannot be undone." />
    </>
  );
}

/* ---------------- Inventory ---------------- */
export function Inventory() {
  const { user } = useAuth();
  const inv = useFetch(() => api.getInventory({ hospitalId: user.hospitalId }), [user.hospitalId]);
  const [edit, setEdit] = useState({});
  const h = inv.data?.[0];

  const saveT = async (g) => {
    const r = await attempt(() => api.setThreshold({ hospitalId: user.hospitalId, group: g, threshold: edit[g] }), { success: `Threshold for ${g} updated.` });
    if (r.ok) { setEdit((e) => { const n = { ...e }; delete n[g]; return n; }); inv.reload(); }
  };
  return (
    <>
      <Title sub="Live blood stock for your hospital">Inventory</Title>
      {inv.loading ? <ListSkeleton count={8} cols="grid-cols-2 lg:grid-cols-4" h="h-40" /> : h && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {h.groups.map((g) => (
            <div key={g.group} className={`rounded-2xl border p-4 ${g.low ? 'border-red-400 bg-red-100' : 'border-red-200 bg-white'}`}>
              <div className="flex items-center justify-between"><BloodGroupBadge group={g.group} size="lg" />
                {g.low && <span className="inline-flex items-center gap-1 rounded-full bg-red-700 px-2 py-0.5 text-xs font-bold text-white"><AlertTriangle size={12} /> Low</span>}</div>
              <p className="mt-2 text-3xl font-extrabold">{g.units}<span className="muted ml-1 text-sm font-medium">units</span></p>
              {g.expiring > 0 && <p className="text-xs font-semibold text-red-800">{g.expiring} expiring soon</p>}
              <label className="mt-3 block text-xs font-semibold" htmlFor={`t-${g.group}`}>Low-stock threshold</label>
              <div className="flex gap-1">
                <input id={`t-${g.group}`} type="number" min={0} className="input !py-1.5" value={edit[g.group] ?? g.threshold} onChange={(e) => setEdit({ ...edit, [g.group]: e.target.value })} />
                {edit[g.group] !== undefined && <button type="button" className="btn-primary btn-sm" onClick={() => saveT(g.group)}>Save</button>}
              </div>
            </div>
          ))}
        </div>
      )}
      <h2 className="mb-3 mt-8 text-lg font-bold">Unit-level stock</h2>
      <DataTable
        loading={inv.loading} rows={h?.units || []} pageSize={10} searchKeys={['id', 'group', 'status']} searchPlaceholder="Search unit ID or group"
        columns={[
          { key: 'id', label: 'Unit ID' },
          { key: 'group', label: 'Group', render: (u) => <BloodGroupBadge group={u.group} size="sm" /> },
          { key: 'collectedOn', label: 'Collected', render: (u) => fmtDate(u.collectedOn), sortValue: (u) => new Date(u.collectedOn) },
          { key: 'expiry', label: 'Expiry', render: (u) => fmtDate(u.expiry), sortValue: (u) => new Date(u.expiry) },
          { key: 'status', label: 'Status', render: (u) => <StatusChip status={u.status} /> },
        ]}
      />
    </>
  );
}

/* ---------------- Record donation ---------------- */
export function RecordDonation() {
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState(null);
  const [busy, setBusy] = useState(false);
  const donors = useFetch(() => api.getDonors({ search: q }), [q], { enabled: q.trim().length >= 2 });
  const camps = useFetch(() => api.getCamps());
  const reqs = useFetch(() => api.getRequests({ hospitalId: user.hospitalId }), [user.hospitalId]);
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ defaultValues: { units: 1, date: toInputDate(), campId: '', requestId: '' } });

  const onSubmit = async (v) => {
    if (!picked) return toast.error('Please search and select a donor first.');
    setBusy(true);
    const r = await attempt(() => api.recordDonation({ ...v, donorId: picked.id, hospitalId: user.hospitalId }), { success: `Donation recorded for ${picked.name}.`, prominent: true });
    setBusy(false);
    if (r.ok) { setPicked(null); setQ(''); reset(); }
  };

  return (
    <>
      <Title sub="Recorded units are added to your inventory automatically">Record donation</Title>
      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-5 p-5" noValidate>
        <div>
          <label htmlFor="ds" className="label">Find donor (name or phone)</label>
          <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-red-700" aria-hidden="true" />
            <input id="ds" className="input pl-9" placeholder="Type at least 2 characters…" value={q} onChange={(e) => { setQ(e.target.value); setPicked(null); }} /></div>
          {!picked && q.trim().length >= 2 && (
            <ul className="mt-2 max-h-56 divide-y divide-red-100 overflow-y-auto rounded-xl border border-red-200">
              {donors.loading ? <li className="p-3 text-sm">Searching…</li> : (donors.data || []).length === 0 ? <li className="p-3 text-sm">No donors found.</li> : donors.data.slice(0, 8).map((d) => (
                <li key={d.id}><button type="button" onClick={() => setPicked(d)} className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-red-50">
                  <span className="flex items-center gap-2"><BloodGroupBadge group={d.group} size="sm" /><span className="font-semibold">{d.name}</span><span className="muted text-xs">{d.city}</span></span>
                  <span className={`text-xs font-bold ${d.eligible ? 'text-red-700' : 'text-red-900'}`}>{d.eligible ? 'Eligible' : `Eligible in ${d.daysRemaining}d`}</span>
                </button></li>
              ))}
            </ul>
          )}
          {picked && <p className="mt-2 flex items-center gap-2 rounded-xl bg-red-100 px-3 py-2 text-sm font-semibold"><BloodGroupBadge group={picked.group} size="sm" /> {picked.name} · {picked.city} <button type="button" className="ml-auto text-xs underline" onClick={() => setPicked(null)}>Change</button></p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput label="Units donated" type="number" helper="1 or 2 units" error={errors.units?.message} {...register('units', { required: 'Required', valueAsNumber: true, min: { value: 1, message: 'Minimum 1' }, max: { value: 2, message: 'Maximum 2' } })} />
          <FormInput label="Donation date" type="date" max={toInputDate()} error={errors.date?.message} {...register('date', { required: 'Date is required' })} />
          <FormSelect label="Linked camp (optional)" placeholder="None" options={(camps.data || []).map((c) => ({ value: c.id, label: c.name }))} {...register('campId')} />
          <FormSelect label="Linked request (optional)" placeholder="None" options={(reqs.data || []).map((r) => ({ value: r.id, label: `${r.id} · ${r.group} · ${r.patientName}` }))} {...register('requestId')} />
        </div>
        <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Recording…' : 'Record donation'}</button>
      </form>
    </>
  );
}

/* ---------------- Transfers ---------------- */
export function Transfers() {
  const { user } = useAuth();
  const hid = user.hospitalId;
  const hosp = useFetch(() => api.getHospitals({ status: 'APPROVED' }));
  const log = useFetch(() => api.getTransfers({ hospitalId: hid }), [hid]);
  const [busy, setBusy] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ defaultValues: { units: 1 } });
  const others = (hosp.data || []).filter((h) => h.id !== hid).map((h) => ({ value: h.id, label: `${h.name} (${h.city})` }));

  const onSubmit = async (v) => {
    setBusy(true);
    const r = await attempt(() => api.createTransfer({ ...v, toHospitalId: hid }), { success: 'Transfer requested.' });
    setBusy(false);
    if (r.ok) { reset(); log.reload(); }
  };
  return (
    <>
      <Title sub="Ask another hospital for stock">Transfers</Title>
      <form onSubmit={handleSubmit(onSubmit)} className="card grid gap-4 p-5 sm:grid-cols-4" noValidate>
        <FormSelect className="sm:col-span-2" label="Request from" placeholder="Choose hospital" options={others} error={errors.fromHospitalId?.message} {...register('fromHospitalId', { required: 'Choose a hospital' })} />
        <FormSelect label="Blood group" placeholder="Select" options={BLOOD_GROUPS} error={errors.group?.message} {...register('group', { required: 'Select a group' })} />
        <FormInput label="Units" type="number" error={errors.units?.message} {...register('units', { valueAsNumber: true, required: 'Required', min: { value: 1, message: 'Min 1' }, max: { value: 20, message: 'Max 20' } })} />
        <div className="sm:col-span-4"><button className="btn-primary" disabled={busy}><Truck size={16} /> {busy ? 'Requesting…' : 'Request stock'}</button></div>
      </form>
      <h2 className="mb-3 mt-8 text-lg font-bold">Transfer log</h2>
      <DataTable loading={log.loading} rows={log.data || []} searchKeys={['fromName', 'toName', 'group', 'status']}
        columns={[
          { key: 'at', label: 'Date', render: (t) => fmtDateTime(t.at), sortValue: (t) => new Date(t.at) },
          { key: 'fromName', label: 'From' },
          { key: 'toName', label: 'To' },
          { key: 'group', label: 'Group', render: (t) => <BloodGroupBadge group={t.group} size="sm" /> },
          { key: 'units', label: 'Units' },
          { key: 'status', label: 'Status', render: (t) => <StatusChip status={t.status} /> },
        ]} />
    </>
  );
}

/* ---------------- Reports (shared with admin) ---------------- */
export function ReportView({ hospitalId, admin = false }) {
  const [range, setRange] = useState({ from: toInputDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)), to: toInputDate() });
  const rep = useFetch(() => api.getMonthlyReport({ ...range, hospitalId }), [range.from, range.to, hospitalId]);
  const r = rep.data;
  const exportCsv = () => {
    if (!r) return;
    const rows = [
      ...r.byGroup.map((g) => ({ section: 'Donations by group', label: g.name, value: g.value })),
      { section: 'Requests', label: 'Fulfilled', value: r.fulfilled },
      { section: 'Requests', label: 'Pending', value: r.pending },
      { section: 'Requests', label: 'Cancelled', value: r.cancelled },
      ...r.topDonors.map((d) => ({ section: 'Top donors', label: `${d.name} (${d.group})`, value: d.units })),
    ];
    downloadCSV(rows, `raktsetu-report-${range.from}-to-${range.to}.csv`) || toast.error('Nothing to export.');
  };
  return (
    <>
      <Title sub="Pick a date range" right={<div className="no-print flex gap-2"><button type="button" className="btn-outline" onClick={exportCsv}>Export CSV</button>{admin && <button type="button" className="btn-primary" onClick={() => window.print()}>Print</button>}</div>}>
        {admin ? 'Monthly summary report' : 'Reports'}
      </Title>
      <div className="no-print card mb-5 grid gap-4 p-4 sm:grid-cols-2">
        <FormInput label="From" type="date" value={range.from} max={range.to} onChange={(e) => setRange({ ...range, from: e.target.value })} />
        <FormInput label="To" type="date" value={range.to} min={range.from} max={toInputDate()} onChange={(e) => setRange({ ...range, to: e.target.value })} />
      </div>
      {rep.loading ? <ListSkeleton count={3} h="h-32" /> : r && (
        <>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard label="Donations" value={r.totalDonations} />
            <StatCard label="Units collected" value={r.totalUnits} />
            <StatCard label="Requests fulfilled" value={r.fulfilled} />
            <StatCard label="Requests pending" value={r.pending} />
            <StatCard label="Cancelled" value={r.cancelled} />
          </div>
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <section className="card p-5"><h2 className="mb-3 font-bold">Donations per blood group</h2>
              <ul className="grid grid-cols-2 gap-2">{r.byGroup.map((g) => <li key={g.name} className="flex items-center justify-between rounded-xl bg-red-50 px-3 py-2"><BloodGroupBadge group={g.name} size="sm" /><span className="font-bold">{g.value}</span></li>)}</ul></section>
            <section className="card p-5"><h2 className="mb-3 font-bold">Top donors</h2>
              {r.topDonors.length === 0 ? <p className="muted text-sm">No donations in this range.</p> : <ol className="space-y-2">{r.topDonors.map((d, i) => <li key={d.id} className="flex items-center justify-between rounded-xl bg-red-50 px-3 py-2 text-sm"><span className="font-semibold">{i + 1}. {d.name} <span className="muted">({d.group})</span></span><span className="font-bold">{d.units} unit(s)</span></li>)}</ol>}</section>
          </div>
        </>
      )}
    </>
  );
}
export function HospitalReports() {
  const { user } = useAuth();
  return <ReportView hospitalId={user.hospitalId} />;
}
