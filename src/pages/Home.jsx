import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, HeartPulse, Siren, Building2, CalendarDays, UserPlus, FilePlus2, GitMerge, Heart, Search, Check, Minus, ChevronDown, Quote } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api';
import useFetch from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { StatCard, StockTile } from '../components/Widgets';
import { RequestCard, CampCard } from '../components/Cards';
import { ListSkeleton, Skeleton } from '../components/Feedback';
import { FormSelect } from '../components/Forms';
import Modal from '../components/Modal';
import { BloodGroupBadge } from '../components/Chips';
import { BLOOD_GROUPS, CITIES, CAN_DONATE_TO } from '../utils/constants';
import { attempt } from '../utils/notify';
import { fmtDate } from '../utils/helpers';

const STEPS = [
  { icon: UserPlus, title: 'Register', text: 'Donors and hospitals sign up in minutes. Hospitals are verified by our admins.' },
  { icon: FilePlus2, title: 'Request', text: 'A hospital raises a request with blood group, units and urgency.' },
  { icon: GitMerge, title: 'Match', text: 'We find compatible, eligible donors in the same city and notify them instantly.' },
  { icon: Heart, title: 'Save a life', text: 'Donors accept, donate, and the hospital records it. Stock stays up to date.' },
];

const FAQ = [
  ['Who can donate blood?', 'Healthy adults aged 18 to 65 who weigh at least 45 kg and meet basic health criteria. Whole-blood donors must wait 90 days between donations.'],
  ['Is my phone number shared with everyone?', 'No. Hospitals only see your name and blood group. Your contact details are shared with the hospital only after you accept a request.'],
  ['How does RaktSetu pick donors?', 'We match exact and compatible blood groups, the same city, availability, and the 90-day donation gap.'],
  ['Does donating blood hurt or weaken me?', 'You will feel a quick pinch. Your body replaces the fluid within a day and red cells within a few weeks.'],
  ['How do hospitals join?', 'Register your hospital with licence details. An admin verifies it, and then you can raise requests and manage stock.'],
];

const TESTIMONIALS = [
  ['Within 40 minutes of raising our request, two donors from Surat were at our blood bank. RaktSetu is a lifesaver.', 'Dr. Meera Nair', 'Lifeline Hospital, Surat'],
  ['I get a call only when my exact group is needed nearby. The 90-day countdown keeps me honest and motivated.', 'Hardik Trivedi', 'Donor, Ahmedabad'],
  ['The stock dashboard shows expiring units early. We have cut wastage and never missed a critical request.', 'Kiran Shah', 'Blood bank in-charge, Vadodara'],
];

function Accordion() {
  const [open, setOpen] = useState(0);
  return (
    <div className="mx-auto max-w-3xl space-y-3">
      {FAQ.map(([q, a], i) => (
        <div key={q} className="card">
          <h3>
            <button type="button" className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left font-bold text-red-950" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>
              {q} <ChevronDown size={18} className={`shrink-0 transition ${open === i ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
          </h3>
          {open === i && <p className="px-5 pb-4 text-sm text-red-900">{a}</p>}
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [group, setGroup] = useState('');
  const [city, setCity] = useState('');
  const [camp, setCamp] = useState(null);
  const [regBusy, setRegBusy] = useState(false);

  const stats = useFetch(() => api.getStats());
  const inv = useFetch(() => api.getInventory());
  const reqs = useFetch(() => api.getRequests());
  const camps = useFetch(() => api.getCamps({ from: new Date().toISOString() }));

  const stock = BLOOD_GROUPS.map((g) => {
    const units = (inv.data || []).reduce((s, h) => s + (h?.groups?.find((x) => x.group === g)?.units || 0), 0);
    return { group: g, units, low: units < 30 };
  });
  const urgent = (reqs.data || []).filter((r) => (r.status === 'OPEN' || r.status === 'PARTIAL') && (r.urgency === 'CRITICAL' || r.status === 'OPEN')).slice(0, 6);

  const search = (e) => {
    e.preventDefault();
    const p = new URLSearchParams();
    if (group) p.set('group', group);
    if (city) p.set('city', city);
    nav(`/find-blood?${p}`);
  };

  const register = async (c) => {
    if (user?.role !== 'donor') {
      toast('Please log in as a donor to register for a camp.', { icon: '🩸' });
      nav('/login', { state: { role: 'donor' } });
      return;
    }
    setRegBusy(true);
    const res = await attempt(() => api.registerForCamp(c.id, user.donorId), { success: `Registered for ${c.name}!` });
    setRegBusy(false);
    if (res.ok) camps.reload();
  };

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-red-100 via-red-50 to-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-red-200/60 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 h-80 w-80 rounded-full bg-red-300/40 blur-3xl" aria-hidden="true" />
        <div className="container-page relative grid items-center gap-10 py-14 lg:grid-cols-2 lg:py-20">
          <div className="animate-fade-in">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold text-red-800 shadow-soft">
              <HeartPulse size={14} aria-hidden="true" /> Blood Donor &amp; Emergency Request Matcher
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-red-950 sm:text-5xl">
              Every drop is a <span className="text-red-600">bridge</span> to a life.
            </h1>
            <p className="mt-4 max-w-xl text-lg text-red-900/85">
              RaktSetu connects hospitals with compatible, eligible donors in the same city, in minutes not hours, and keeps every unit of blood accounted for.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/register/donor" className="btn-primary px-6 py-3 text-base">Become a Donor</Link>
              <Link to="/emergency" className="btn-outline px-6 py-3 text-base">Request Blood</Link>
            </div>
          </div>
          <form onSubmit={search} className="glass animate-fade-in p-5 sm:p-6" aria-label="Quick donor search">
            <h2 className="flex items-center gap-2 text-lg font-bold"><Search size={18} className="text-red-600" aria-hidden="true" /> Quick search</h2>
            <p className="muted mb-4 text-sm">Find blood stock and eligible donors near you.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormSelect label="Blood group" placeholder="Any group" options={BLOOD_GROUPS} value={group} onChange={(e) => setGroup(e.target.value)} />
              <FormSelect label="City" placeholder="Any city" options={CITIES} value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <button type="submit" className="btn-primary mt-4 w-full">Search donors</button>
          </form>
        </div>
      </section>

      {/* STATS */}
      <section className="container-page -mt-6 relative z-10" aria-label="Live statistics">
        {stats.loading ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <StatCard icon={Users} label="Registered donors" value={stats.data?.donors ?? 0} />
            <StatCard icon={HeartPulse} label="Lives helped" value={stats.data?.donations ?? 0} hint="donations recorded" />
            <StatCard icon={Siren} label="Open requests" value={stats.data?.openRequests ?? 0} />
            <StatCard icon={Building2} label="Active hospitals" value={stats.data?.hospitals ?? 0} />
            <StatCard icon={CalendarDays} label="Camps this month" value={stats.data?.campsThisMonth ?? 0} />
          </div>
        )}
      </section>

      {/* STOCK */}
      <section className="container-page py-14">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-2xl font-extrabold">Live blood stock</h2>
            <p className="muted text-sm">Units available across all verified hospitals.</p>
          </div>
          <Link to="/stock" className="btn-ghost">View by hospital →</Link>
        </div>
        {inv.loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-36" />)}</div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
            {stock.map((s) => <StockTile key={s.group} {...s} />)}
          </div>
        )}
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-white py-14">
        <div className="container-page">
          <h2 className="mb-8 text-center text-2xl font-extrabold">How it works</h2>
          <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="card lift relative p-5">
                <span className="absolute -top-3 left-5 rounded-full bg-red-900 px-2.5 py-0.5 text-xs font-bold text-white">Step {i + 1}</span>
                <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-700"><Icon size={24} aria-hidden="true" /></span>
                <h3 className="text-lg font-bold">{title}</h3>
                <p className="muted mt-1 text-sm">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* COMPATIBILITY */}
      <section className="container-page py-14">
        <h2 className="text-2xl font-extrabold">Blood compatibility chart</h2>
        <p className="muted mb-5 text-sm">Read across: the row shows which recipients a donor group can give to.</p>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[560px] text-center">
            <caption className="sr-only">Blood donation compatibility: donor groups (rows) and recipient groups (columns)</caption>
            <thead>
              <tr>
                <th className="th text-left" scope="col">Donor ↓ / Recipient →</th>
                {BLOOD_GROUPS.map((g) => <th key={g} scope="col" className="th text-center">{g}</th>)}
              </tr>
            </thead>
            <tbody>
              {BLOOD_GROUPS.map((d) => (
                <tr key={d} className="border-t border-red-100">
                  <th scope="row" className="td text-left"><BloodGroupBadge group={d} size="sm" /></th>
                  {BLOOD_GROUPS.map((r) => {
                    const ok = CAN_DONATE_TO[d].includes(r);
                    return (
                      <td key={r} className={`td ${ok ? 'bg-red-100' : ''}`}>
                        {ok ? <><Check size={16} className="mx-auto text-red-700" aria-hidden="true" /><span className="sr-only">Can donate</span></> : <><Minus size={14} className="mx-auto text-red-300" aria-hidden="true" /><span className="sr-only">Cannot donate</span></>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* URGENT TICKER */}
      <section className="bg-red-100/60 py-14">
        <div className="container-page">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-2xl font-extrabold"><Siren className="text-red-700" aria-hidden="true" /> Urgent requests right now</h2>
            <Link to="/emergency" className="btn-primary btn-sm">Raise a request</Link>
          </div>
          {reqs.loading ? <ListSkeleton count={3} h="h-44" /> : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {urgent.map((r) => <RequestCard key={r.id} r={r} compact />)}
            </div>
          )}
        </div>
      </section>

      {/* CAMPS */}
      <section className="container-page py-14">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-extrabold">Upcoming donation camps</h2>
          <Link to="/camps" className="btn-ghost">All camps →</Link>
        </div>
        {camps.loading ? <ListSkeleton /> : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(camps.data || []).slice(0, 3).map((c) => <CampCard key={c.id} camp={c} onOpen={setCamp} onRegister={register} busy={regBusy} />)}
          </div>
        )}
      </section>

      {/* TESTIMONIALS */}
      <section className="bg-white py-14">
        <div className="container-page">
          <h2 className="mb-8 text-center text-2xl font-extrabold">Voices from the bridge</h2>
          <div className="grid gap-5 md:grid-cols-3">
            {TESTIMONIALS.map(([quote, who, role]) => (
              <figure key={who} className="card p-6">
                <Quote className="text-red-300" size={28} aria-hidden="true" />
                <blockquote className="mt-2 text-sm text-red-900">{quote}</blockquote>
                <figcaption className="mt-4 text-sm"><span className="font-bold">{who}</span><span className="muted block text-xs">{role}</span></figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="container-page py-14">
        <h2 className="mb-6 text-center text-2xl font-extrabold">Frequently asked questions</h2>
        <Accordion />
      </section>

      {/* CTA */}
      <section className="container-page pb-4">
        <div className="rounded-3xl bg-gradient-to-r from-red-800 to-red-600 p-8 text-center text-white shadow-lift sm:p-12">
          <h2 className="text-3xl font-extrabold text-white">Your 30 minutes can give someone a lifetime.</h2>
          <p className="mx-auto mt-2 max-w-xl text-red-100">Join thousands of donors across Surat, Ahmedabad, Vadodara, Mumbai and Pune.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/register/donor" className="btn bg-white px-6 py-3 text-red-800 hover:bg-red-100">Become a Donor</Link>
            <Link to="/register/hospital" className="btn border border-white/70 px-6 py-3 text-white hover:bg-white/10">Register your hospital</Link>
          </div>
        </div>
      </section>

      <Modal open={!!camp} onClose={() => setCamp(null)} title={camp?.name || ''}
        footer={camp && new Date(camp.date) > new Date() && <button type="button" className="btn-primary" onClick={() => { register(camp); setCamp(null); }}>Register for camp</button>}>
        {camp && (
          <dl className="space-y-2 text-sm">
            <div><dt className="font-bold">Organizer</dt><dd>{camp.organizer}</dd></div>
            <div><dt className="font-bold">When</dt><dd>{fmtDate(camp.date)}</dd></div>
            <div><dt className="font-bold">Where</dt><dd>{camp.venue}, {camp.city}</dd></div>
          </dl>
        )}
      </Modal>
    </>
  );
}
