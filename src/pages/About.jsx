import { Link } from 'react-router-dom';
import { UserCheck, CalendarClock, Scale, HeartPulse, ClipboardList, Droplet, Coffee, Smile, CheckCircle2, XCircle } from 'lucide-react';

const CRITERIA = [
  [UserCheck, 'Age 18 to 65', 'You must be at least 18 and not older than 65 years.'],
  [Scale, 'Weight 45 kg or more', 'This keeps the donation safe for you.'],
  [CalendarClock, '90-day gap', 'Wait at least 90 days between whole-blood donations.'],
  [HeartPulse, 'Good general health', 'No fever, infection, major illness, recent tattoo or piercing (6 months), or risky recent travel.'],
];
const PROCESS = [
  [ClipboardList, 'Registration & screening', 'Fill a short form and answer health questions.'],
  [HeartPulse, 'Mini health check', 'Pulse, blood pressure, temperature and haemoglobin are checked.'],
  [Droplet, 'Donation', 'The donation itself takes only 8 to 10 minutes.'],
  [Coffee, 'Rest & refreshments', 'Relax for 15 minutes with a snack and a drink.'],
];
const MYTHS = [
  ['Donating blood makes you weak.', 'Your body replaces the fluid within 24 hours and red cells within weeks. Most people resume normal activity the same day.'],
  ['Vegetarians cannot donate.', 'Diet type does not matter. A healthy haemoglobin level is what counts.'],
  ['Donating is painful.', 'You feel a brief pinch from the needle. The rest is painless.'],
  ['You can donate any time you like.', 'Whole blood donors need a 90-day gap, so your body fully recovers.'],
  ['Blood donation is not needed unless there is a disaster.', 'Blood has a shelf life of about 35 days. Patients need a steady supply every single day.'],
];

export default function About() {
  return (
    <div className="container-page py-10">
      <h1 className="text-3xl font-extrabold">About blood donation</h1>
      <p className="muted mb-8 max-w-2xl">Everything you need to know before you donate. Clear, simple and honest.</p>

      <section aria-labelledby="who" className="mb-12">
        <h2 id="who" className="mb-4 text-2xl font-bold">Who can donate?</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CRITERIA.map(([Icon, t, d]) => (
            <div key={t} className="card lift p-5">
              <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-red-100 text-red-700"><Icon size={22} aria-hidden="true" /></span>
              <h3 className="font-bold">{t}</h3>
              <p className="muted mt-1 text-sm">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="process" className="mb-12">
        <h2 id="process" className="mb-4 text-2xl font-bold">The donation process</h2>
        <ol className="grid gap-4 md:grid-cols-4">
          {PROCESS.map(([Icon, t, d], i) => (
            <li key={t} className="card p-5">
              <span className="mb-2 inline-flex items-center gap-2 text-xs font-bold text-red-700"><Icon size={16} aria-hidden="true" /> Step {i + 1}</span>
              <h3 className="font-bold">{t}</h3>
              <p className="muted mt-1 text-sm">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="myths" className="mb-12">
        <h2 id="myths" className="mb-4 text-2xl font-bold">Myths vs facts</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {MYTHS.map(([m, f]) => (
            <div key={m} className="card overflow-hidden">
              <p className="flex items-start gap-2 bg-red-100 px-5 py-3 text-sm font-bold text-red-900"><XCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" /><span><span className="sr-only">Myth: </span>{m}</span></p>
              <p className="flex items-start gap-2 px-5 py-3 text-sm"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-red-700" aria-hidden="true" /><span><span className="font-bold">Fact: </span>{f}</span></p>
            </div>
          ))}
        </div>
      </section>

      <div className="rounded-3xl bg-red-900 p-8 text-center text-white">
        <Smile className="mx-auto mb-2" aria-hidden="true" />
        <h2 className="text-2xl font-extrabold text-white">Ready to be someone's hero?</h2>
        <Link to="/register/donor" className="btn mt-4 bg-white px-6 py-3 text-red-800 hover:bg-red-100">Register as a donor</Link>
      </div>
    </div>
  );
}
