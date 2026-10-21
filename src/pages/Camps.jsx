import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../api';
import useFetch from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { CampCard } from '../components/Cards';
import { FormSelect, FormInput } from '../components/Forms';
import { ListSkeleton, EmptyState } from '../components/Feedback';
import Modal from '../components/Modal';
import { CITIES } from '../utils/constants';
import { attempt } from '../utils/notify';
import { fmtDate, toInputDate } from '../utils/helpers';

export default function Camps() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [city, setCity] = useState('');
  const [from, setFrom] = useState(toInputDate(new Date(Date.now() - 90 * 86400000)));
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState(false);
  const camps = useFetch(() => api.getCamps({ city: city || undefined, from: from ? new Date(from).toISOString() : undefined }), [city, from]);
  const detail = useFetch(() => api.getCamp(open.id), [open?.id], { enabled: !!open });
  const mine = useFetch(() => api.getCamps(), [], { enabled: user?.role === 'donor' });

  const registeredIds = new Set(
    (user?.role === 'donor' ? [] : []).concat(
      (camps.data || []).filter((c) => c.registrations?.includes(user?.donorId)).map((c) => c.id)
    )
  );

  const register = async (c) => {
    if (user?.role !== 'donor') {
      toast('Please log in as a donor to register for a camp.', { icon: '🩸' });
      nav('/login', { state: { role: 'donor', from: '/camps' } });
      return;
    }
    setBusy(true);
    const r = await attempt(() => api.registerForCamp(c.id, user.donorId), { success: `Registered for ${c.name}!` });
    setBusy(false);
    if (r.ok) { camps.reload(); mine.reload(); if (open) detail.reload(); }
  };

  return (
    <div className="container-page py-10">
      <h1 className="text-3xl font-extrabold">Blood donation camps</h1>
      <p className="muted mb-6">Join a camp near you. Every unit collected can save up to three lives.</p>
      <div className="card mb-6 grid gap-4 p-4 sm:grid-cols-3">
        <FormSelect label="City" placeholder="All cities" options={CITIES} value={city} onChange={(e) => setCity(e.target.value)} />
        <FormInput label="From date" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <div className="flex items-end"><button type="button" className="btn-outline w-full" onClick={() => { setCity(''); setFrom(toInputDate(new Date(Date.now() - 90 * 86400000))); }}>Reset filters</button></div>
      </div>
      {camps.loading ? <ListSkeleton count={6} h="h-56" /> : (camps.data || []).length === 0 ? (
        <EmptyState title="No camps found" message="Try a different city or an earlier start date." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {camps.data.map((c) => <CampCard key={c.id} camp={c} registered={registeredIds.has(c.id)} busy={busy} onOpen={setOpen} onRegister={register} />)}
        </div>
      )}

      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.name || ''}
        footer={open && new Date(open.date) > new Date() && (
          <button type="button" className="btn-primary" disabled={busy || registeredIds.has(open.id)} onClick={() => register(open)}>
            {registeredIds.has(open.id) ? 'Registered' : 'Register for camp'}
          </button>
        )}>
        {open && (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="font-bold">Organizer</dt><dd>{open.organizer}</dd></div>
            <div><dt className="font-bold">Date</dt><dd>{fmtDate(open.date)}</dd></div>
            <div><dt className="font-bold">Venue</dt><dd>{open.venue}, {open.city}</dd></div>
            <div><dt className="font-bold">Registered donors</dt><dd>{detail.data?.registrationCount ?? open.registrationCount}</dd></div>
            {new Date(open.date) < new Date() && <div><dt className="font-bold">Units collected</dt><dd>{open.unitsCollected}</dd></div>}
            <div className="sm:col-span-2 rounded-xl bg-red-50 p-3 text-xs text-red-900">Bring a photo ID, eat a light meal, drink water, and avoid donating if you feel unwell.</div>
          </dl>
        )}
      </Modal>
    </div>
  );
}
