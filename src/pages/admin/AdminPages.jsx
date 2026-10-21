import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Users, Building2, Siren, HeartPulse, Package, Hourglass, Check, X, Eye, UserX, UserCheck, Download, Plus, Pencil, Trash2 } from 'lucide-react';
import { api } from '../../api';
import useFetch from '../../hooks/useFetch';
import { StatCard } from '../../components/Widgets';
import StarterChart from '../../components/StarterChart';
import DataTable from '../../components/DataTable';
import { BloodGroupBadge, UrgencyChip, StatusChip } from '../../components/Chips';
import { FormInput, FormSelect, FormTextarea } from '../../components/Forms';
import { ListSkeleton } from '../../components/Feedback';
import Modal, { ConfirmDialog } from '../../components/Modal';
import { ReportView } from '../hospital/HospitalPages';
import { BLOOD_GROUPS, CITIES, REQUEST_STATUSES, URGENCIES } from '../../utils/constants';
import { attempt } from '../../utils/notify';
import { fmtDate, fmtDateTime, downloadCSV, toInputDateTime, toInputDate } from '../../utils/helpers';
import toast from 'react-hot-toast';

const Title = ({ children, sub, right }) => (
  <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
    <div><h1 className="text-2xl font-extrabold">{children}</h1>{sub && <p className="muted text-sm">{sub}</p>}</div>
    {right}
  </div>
);
const Sel = ({ label, value, onChange, opts, ph }) => (
  <select aria-label={label} className="input w-auto" value={value} onChange={(e) => onChange(e.target.value)}>
    <option value="">{ph}</option>{opts.map((o) => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
  </select>
);

/* ---------------- Dashboard ---------------- */
export function AdminDashboard() {
  const c = useFetch(() => api.getCharts());
  const d = c.data;
  return (
    <>
      <Title sub="System-wide overview">Admin dashboard</Title>
      {c.loading || !d ? <ListSkeleton count={6} cols="grid-cols-2 lg:grid-cols-3" h="h-28" /> : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard icon={Users} label="Donors" value={d.kpis.donors} />
            <StatCard icon={Building2} label="Hospitals" value={d.kpis.hospitals} hint={`${d.kpis.pendingHospitals} pending`} />
            <StatCard icon={Siren} label="Requests" value={d.kpis.requests} />
            <StatCard icon={HeartPulse} label="Donations" value={d.kpis.donations} />
            <StatCard icon={Package} label="Units in stock" value={d.kpis.units} />
            <StatCard icon={Hourglass} label="Pending approvals" value={d.kpis.pendingHospitals} />
          </div>
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <section className="card p-5"><h2 className="mb-2 font-bold">Stock by blood group</h2><StarterChart type="bar" data={d.stockByGroup} label="Stock by blood group" /></section>
            <section className="card p-5"><h2 className="mb-2 font-bold">Requests per month</h2><StarterChart type="line" data={d.requestsPerMonth} label="Requests per month" /></section>
            <section className="card p-5"><h2 className="mb-2 font-bold">Fulfilment rate</h2><StarterChart type="donut" data={d.fulfilment} label="Fulfilment" /></section>
            <section className="card p-5"><h2 className="mb-2 font-bold">Units collected by camp</h2><StarterChart type="bar" data={d.donationsByCamp} label="Donations by camp" /></section>
          </div>
        </>
      )}
    </>
  );
}

/* ---------------- Hospitals ---------------- */
export function AdminHospitals() {
  const hs = useFetch(() => api.getHospitals());
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const act = async (h, status) => {
    const r = await attempt(() => api.setHospitalStatus(h.id, status), { success: `${h.name} ${status.toLowerCase()}.` });
    if (r.ok) hs.reload();
  };
  const add = async (v) => {
    setBusy(true);
    const r = await attempt(() => api.addHospital(v), { success: 'Hospital added and approved. Default password: hospital123' });
    setBusy(false);
    if (r.ok) { setAdding(false); reset(); hs.reload(); }
  };
  return (
    <>
      <Title sub="Verify and manage hospitals" right={<button type="button" className="btn-primary" onClick={() => setAdding(true)}><Plus size={16} /> Add hospital</button>}>Hospitals</Title>
      <DataTable loading={hs.loading} rows={hs.data || []} searchKeys={['name', 'city', 'license', 'email']} searchPlaceholder="Search hospitals"
        columns={[
          { key: 'name', label: 'Hospital', render: (h) => <><span className="font-bold">{h.name}</span><span className="muted block text-xs">{h.license}</span></> },
          { key: 'city', label: 'City' },
          { key: 'contactPerson', label: 'Contact', render: (h) => <>{h.contactPerson}<span className="muted block text-xs">{h.phone}</span></> },
          { key: 'status', label: 'Verification', render: (h) => <StatusChip status={h.status} /> },
          { key: 'act', label: 'Actions', sortable: false, render: (h) => (
            <div className="flex gap-1">
              <button type="button" className="btn-primary btn-sm" disabled={h.status === 'APPROVED'} onClick={() => act(h, 'APPROVED')}><Check size={13} /> Approve</button>
              <button type="button" className="btn-outline btn-sm" disabled={h.status === 'REJECTED'} onClick={() => act(h, 'REJECTED')}><X size={13} /> Reject</button>
            </div>) },
        ]} />
      <Modal open={adding} onClose={() => setAdding(false)} title="Add hospital" size="lg">
        <form onSubmit={handleSubmit(add)} className="grid gap-4 sm:grid-cols-2" noValidate>
          <FormInput className="sm:col-span-2" label="Hospital name" error={errors.name?.message} {...register('name', { required: 'Required' })} />
          <FormInput label="Licence number" error={errors.license?.message} {...register('license', { required: 'Required' })} />
          <FormSelect label="City" placeholder="Select" options={CITIES} error={errors.city?.message} {...register('city', { required: 'Required' })} />
          <FormInput label="Phone" maxLength={10} error={errors.phone?.message} {...register('phone', { required: 'Required', pattern: { value: /^\d{10}$/, message: '10 digits' } })} />
          <FormInput label="Email" type="email" error={errors.email?.message} {...register('email', { required: 'Required' })} />
          <FormInput className="sm:col-span-2" label="Contact person" error={errors.contactPerson?.message} {...register('contactPerson', { required: 'Required' })} />
          <FormTextarea className="sm:col-span-2" label="Address" {...register('address')} />
          <div className="sm:col-span-2"><button className="btn-primary" disabled={busy}>{busy ? 'Adding…' : 'Add & approve'}</button></div>
        </form>
      </Modal>
    </>
  );
}

/* ---------------- Donors ---------------- */
export function AdminDonors() {
  const [f, setF] = useState({ group: '', city: '', available: '' });
  const donors = useFetch(() => api.getDonors({ group: f.group || undefined, city: f.city || undefined, available: f.available || undefined }), [f.group, f.city, f.available]);
  const [view, setView] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    setBusy(true);
    const r = await attempt(() => api.setDonorActive(confirm.id, !confirm.active), { success: `${confirm.name} ${confirm.active ? 'deactivated' : 'reactivated'}.` });
    setBusy(false);
    setConfirm(null);
    if (r.ok) donors.reload();
  };
  const exp = () => {
    const rows = (donors.data || []).map((d) => ({ id: d.id, name: d.name, group: d.group, city: d.city, phone: d.phone, available: d.available, active: d.active, lastDonation: d.lastDonation ? fmtDate(d.lastDonation) : '', donations: d.totalDonations }));
    downloadCSV(rows, 'raktsetu-donors.csv') || toast.error('No donors to export.');
  };
  return (
    <>
      <Title sub="Search, filter and manage donors" right={<button type="button" className="btn-outline" onClick={exp}><Download size={16} /> Export CSV</button>}>Donors</Title>
      <DataTable loading={donors.loading} rows={donors.data || []} searchKeys={['name', 'phone', 'city', 'group']} searchPlaceholder="Search name or phone"
        toolbar={<><Sel label="Blood group" ph="All groups" opts={BLOOD_GROUPS} value={f.group} onChange={(v) => setF({ ...f, group: v })} />
          <Sel label="City" ph="All cities" opts={CITIES} value={f.city} onChange={(v) => setF({ ...f, city: v })} />
          <Sel label="Availability" ph="Any availability" opts={[{ value: 'true', label: 'Available' }, { value: 'false', label: 'Unavailable' }]} value={f.available} onChange={(v) => setF({ ...f, available: v })} /></>}
        columns={[
          { key: 'name', label: 'Donor', render: (d) => <><span className="font-bold">{d.name}</span><span className="muted block text-xs">{d.phone}</span></> },
          { key: 'group', label: 'Group', render: (d) => <BloodGroupBadge group={d.group} size="sm" /> },
          { key: 'city', label: 'City' },
          { key: 'available', label: 'Availability', render: (d) => (d.available ? 'Available' : 'Unavailable') },
          { key: 'eligible', label: 'Eligible', render: (d) => (d.eligible ? 'Yes' : `In ${d.daysRemaining}d`) },
          { key: 'active', label: 'Status', render: (d) => <StatusChip status={d.active ? 'ACTIVE' : 'INACTIVE'} /> },
          { key: 'act', label: '', sortable: false, render: (d) => (
            <div className="flex gap-1">
              <button type="button" className="btn-outline btn-sm" aria-label={`View ${d.name}`} onClick={() => setView(d)}><Eye size={13} /></button>
              <button type="button" className="btn-outline btn-sm" aria-label={d.active ? `Deactivate ${d.name}` : `Reactivate ${d.name}`} onClick={() => setConfirm(d)}>{d.active ? <UserX size={13} /> : <UserCheck size={13} />}</button>
            </div>) },
        ]} />
      <Modal open={!!view} onClose={() => setView(null)} title={view?.name || ''}>
        {view && <dl className="grid grid-cols-2 gap-3 text-sm">
          {[['Blood group', view.group], ['City', `${view.area}, ${view.city}`], ['Phone', view.phone], ['Email', view.email || '—'], ['Date of birth', fmtDate(view.dob)], ['Weight', `${view.weight} kg`],
            ['Last donation', fmtDate(view.lastDonation)], ['Total donations', view.totalDonations], ['Preferred time', view.preferredTime], ['Joined', fmtDate(view.createdAt)]].map(([k, v]) => (
            <div key={k}><dt className="muted text-xs font-bold uppercase">{k}</dt><dd className="font-semibold">{v}</dd></div>))}</dl>}
      </Modal>
      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={toggle} loading={busy} danger={confirm?.active} title={confirm?.active ? 'Deactivate donor?' : 'Reactivate donor?'}
        confirmText={confirm?.active ? 'Deactivate' : 'Reactivate'} message={confirm?.active ? `${confirm?.name} will no longer be matched or able to log in.` : `${confirm?.name} will be matched and able to log in again.`} />
    </>
  );
}

/* ---------------- Requests ---------------- */
export function AdminRequests() {
  const [f, setF] = useState({ status: '', urgency: '', group: '', city: '' });
  const reqs = useFetch(() => api.getRequests({ status: f.status || undefined, urgency: f.urgency || undefined, group: f.group || undefined, city: f.city || undefined }), [f.status, f.urgency, f.group, f.city]);
  const [edit, setEdit] = useState(null);
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    const r = await attempt(() => api.overrideStatus(edit.id, next), { success: `Request ${edit.id} set to ${next}.` });
    setBusy(false);
    if (r.ok) { setEdit(null); reqs.reload(); }
  };
  return (
    <>
      <Title sub="All hospital and public requests">Requests</Title>
      <DataTable loading={reqs.loading} rows={reqs.data || []} searchKeys={['id', 'patientName', 'hospitalName', 'city']} searchPlaceholder="Search requests"
        toolbar={<><Sel label="Status" ph="All statuses" opts={REQUEST_STATUSES} value={f.status} onChange={(v) => setF({ ...f, status: v })} />
          <Sel label="Urgency" ph="All urgencies" opts={URGENCIES} value={f.urgency} onChange={(v) => setF({ ...f, urgency: v })} />
          <Sel label="Blood group" ph="All groups" opts={BLOOD_GROUPS} value={f.group} onChange={(v) => setF({ ...f, group: v })} />
          <Sel label="City" ph="All cities" opts={CITIES} value={f.city} onChange={(v) => setF({ ...f, city: v })} /></>}
        columns={[
          { key: 'id', label: 'ID' },
          { key: 'hospitalName', label: 'Hospital', render: (r) => <>{r.hospitalName}<span className="muted block text-xs">{r.city}</span></> },
          { key: 'patientName', label: 'Patient' },
          { key: 'group', label: 'Group', render: (r) => <><BloodGroupBadge group={r.group} size="sm" /> <span className="muted text-xs">×{r.units}</span></> },
          { key: 'urgency', label: 'Urgency', render: (r) => <UrgencyChip urgency={r.urgency} />, sortValue: (r) => URGENCIES.indexOf(r.urgency) },
          { key: 'status', label: 'Status', render: (r) => <StatusChip status={r.status} /> },
          { key: 'createdAt', label: 'Created', render: (r) => fmtDate(r.createdAt), sortValue: (r) => new Date(r.createdAt) },
          { key: 'act', label: '', sortable: false, render: (r) => <button type="button" className="btn-outline btn-sm" onClick={() => { setEdit(r); setNext(r.status); }}><Pencil size={13} /> Override</button> },
        ]} />
      <Modal open={!!edit} onClose={() => setEdit(null)} title={`Override status: ${edit?.id}`} size="sm"
        footer={<><button type="button" className="btn-outline" onClick={() => setEdit(null)}>Cancel</button><button type="button" className="btn-primary" disabled={busy || next === edit?.status} onClick={save}>Save status</button></>}>
        <p className="muted mb-3 text-sm">This is recorded in the audit log.</p>
        <FormSelect label="New status" options={REQUEST_STATUSES} value={next} onChange={(e) => setNext(e.target.value)} />
      </Modal>
    </>
  );
}

/* ---------------- Camps ---------------- */
export function AdminCamps() {
  const camps = useFetch(() => api.getCamps());
  const [edit, setEdit] = useState(null); // {} for new, camp for existing
  const [regs, setRegs] = useState(null);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const open = (c) => {
    setEdit(c || {});
    reset(c ? { name: c.name, organizer: c.organizer, city: c.city, venue: c.venue, date: toInputDateTime(c.date), unitsCollected: c.unitsCollected } : { name: '', organizer: '', city: '', venue: '', date: toInputDateTime(new Date(Date.now() + 7 * 86400000)), unitsCollected: 0 });
  };
  const save = async (v) => {
    setBusy(true);
    const r = await attempt(() => (edit.id ? api.updateCamp(edit.id, v) : api.createCamp(v)), { success: edit.id ? 'Camp updated.' : 'Camp created.' });
    setBusy(false);
    if (r.ok) { setEdit(null); camps.reload(); }
  };
  const remove = async () => {
    setBusy(true);
    const r = await attempt(() => api.deleteCamp(del.id), { success: 'Camp deleted.' });
    setBusy(false); setDel(null);
    if (r.ok) camps.reload();
  };
  const showRegs = async (c) => { const r = await attempt(() => api.getCamp(c.id)); if (r.ok) setRegs(r.data); };

  return (
    <>
      <Title sub="Create and manage donation camps" right={<button type="button" className="btn-primary" onClick={() => open(null)}><Plus size={16} /> New camp</button>}>Camps</Title>
      <DataTable loading={camps.loading} rows={camps.data || []} searchKeys={['name', 'city', 'organizer']} searchPlaceholder="Search camps"
        columns={[
          { key: 'name', label: 'Camp', render: (c) => <><span className="font-bold">{c.name}</span><span className="muted block text-xs">{c.organizer}</span></> },
          { key: 'city', label: 'Location', render: (c) => <>{c.venue}<span className="muted block text-xs">{c.city}</span></> },
          { key: 'date', label: 'Date', render: (c) => fmtDate(c.date), sortValue: (c) => new Date(c.date) },
          { key: 'registrationCount', label: 'Registrations', render: (c) => <button type="button" className="font-bold text-red-700 underline" onClick={() => showRegs(c)}>{c.registrationCount}</button> },
          { key: 'unitsCollected', label: 'Units collected' },
          { key: 'act', label: '', sortable: false, render: (c) => (
            <div className="flex gap-1">
              <button type="button" className="btn-outline btn-sm" aria-label={`Edit ${c.name}`} onClick={() => open(c)}><Pencil size={13} /></button>
              <button type="button" className="btn-outline btn-sm" aria-label={`Delete ${c.name}`} onClick={() => setDel(c)}><Trash2 size={13} /></button>
            </div>) },
        ]} />
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit camp' : 'New camp'} size="lg">
        <form onSubmit={handleSubmit(save)} className="grid gap-4 sm:grid-cols-2" noValidate>
          <FormInput className="sm:col-span-2" label="Camp name" error={errors.name?.message} {...register('name', { required: 'Required' })} />
          <FormInput label="Organizer" error={errors.organizer?.message} {...register('organizer', { required: 'Required' })} />
          <FormSelect label="City" placeholder="Select" options={CITIES} error={errors.city?.message} {...register('city', { required: 'Required' })} />
          <FormInput label="Venue" error={errors.venue?.message} {...register('venue', { required: 'Required' })} />
          <FormInput label="Date & time" type="datetime-local" error={errors.date?.message} {...register('date', { required: 'Required' })} />
          {edit?.id && <FormInput label="Units collected" type="number" min={0} {...register('unitsCollected')} />}
          <div className="sm:col-span-2"><button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save camp'}</button></div>
        </form>
      </Modal>
      <Modal open={!!regs} onClose={() => setRegs(null)} title={`Registrations: ${regs?.name || ''}`} size="sm">
        {regs && (regs.registered.length === 0 ? <p className="muted text-sm">No registrations yet.</p> : <ul className="space-y-2">{regs.registered.map((r) => <li key={r.id} className="flex items-center justify-between rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold">{r.name}<BloodGroupBadge group={r.group} size="sm" /></li>)}</ul>)}
      </Modal>
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} onConfirm={remove} loading={busy} danger title="Delete camp?" confirmText="Delete" message={`"${del?.name}" and its registrations will be removed.`} />
    </>
  );
}

/* ---------------- Reports ---------------- */
export const AdminReports = () => <ReportView admin />;

/* ---------------- Audit ---------------- */
export function AdminAudit() {
  const [f, setF] = useState({ from: '', to: '', user: '' });
  const log = useFetch(() => api.getAudit({ from: f.from || undefined, to: f.to || undefined, user: f.user || undefined }), [f.from, f.to, f.user]);
  return (
    <>
      <Title sub="Who changed what, and when">Audit log</Title>
      <div className="card mb-4 grid gap-4 p-4 sm:grid-cols-3">
        <FormInput label="From" type="date" value={f.from} max={toInputDate()} onChange={(e) => setF({ ...f, from: e.target.value })} />
        <FormInput label="To" type="date" value={f.to} max={toInputDate()} onChange={(e) => setF({ ...f, to: e.target.value })} />
        <FormInput label="User" placeholder="Filter by name" value={f.user} onChange={(e) => setF({ ...f, user: e.target.value })} />
      </div>
      <DataTable loading={log.loading} rows={log.data || []} pageSize={10} searchKeys={['action', 'entity', 'detail', 'user']} emptyTitle="No log entries" emptyText="Nothing matches these filters."
        columns={[
          { key: 'at', label: 'When', render: (a) => fmtDateTime(a.at), sortValue: (a) => new Date(a.at) },
          { key: 'user', label: 'User', render: (a) => <>{a.user}<span className="muted block text-xs capitalize">{a.role}</span></> },
          { key: 'action', label: 'Action', render: (a) => <span className="rounded-lg bg-red-100 px-2 py-1 text-xs font-bold text-red-900">{a.action.replaceAll('_', ' ')}</span> },
          { key: 'entity', label: 'Entity' },
          { key: 'detail', label: 'Details' },
        ]} />
    </>
  );
}
