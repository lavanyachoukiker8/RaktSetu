import { Link } from 'react-router-dom';
import { Phone, Heart } from 'lucide-react';
import Logo from './Logo';

export default function Footer() {
  return (
    <footer className="no-print mt-16 bg-red-950 text-red-100">
      <div className="container-page grid gap-8 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo light />
          <p className="mt-3 max-w-md text-sm text-red-200">
            RaktSetu is a bridge between hospitals, blood donors and patients. When an urgent request is raised, we match compatible, eligible donors in the same city and track every unit of blood.
          </p>
          <p className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-white">
            <Phone size={16} aria-hidden="true" /> Helpline: 1800-XXX-XXXX (24×7)
          </p>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-red-300">Quick links</h3>
          <ul className="space-y-2 text-sm">
            {[['/find-blood', 'Find Blood'], ['/register/donor', 'Become a Donor'], ['/camps', 'Donation Camps'], ['/stock', 'Blood Stock'], ['/about', 'Eligibility & FAQs']].map(([to, l]) => (
              <li key={to}><Link to={to} className="hover:text-white hover:underline">{l}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-red-300">For hospitals</h3>
          <ul className="space-y-2 text-sm">
            <li><Link to="/register/hospital" className="hover:text-white hover:underline">Register hospital</Link></li>
            <li><Link to="/login" className="hover:text-white hover:underline">Hospital login</Link></li>
            <li><Link to="/emergency" className="hover:text-white hover:underline">Emergency request</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-red-900">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-4 text-xs text-red-300 sm:flex-row">
          <p className="inline-flex items-center gap-1.5 font-semibold text-white"><Heart size={14} aria-hidden="true" /> Donate blood, save lives.</p>
          <p>© {new Date().getFullYear()} RaktSetu · <a href="#privacy" className="hover:underline">Privacy</a> · <a href="#terms" className="hover:underline">Terms</a></p>
        </div>
      </div>
    </footer>
  );
}
