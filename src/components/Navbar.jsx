import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, Siren, LayoutDashboard, UserCircle, LogOut, ChevronDown } from 'lucide-react';
import Logo from './Logo';
import { useAuth, homePathFor } from '../context/AuthContext';
import { initials } from '../utils/helpers';
import toast from 'react-hot-toast';

export function AnnouncementStrip() {
  return (
    <div className="no-print bg-red-900 px-4 py-1.5 text-center text-xs font-medium text-white sm:text-sm">
      Emergency? Raise a request in 60 seconds.{' '}
      <Link to="/emergency" className="font-bold underline underline-offset-2 hover:text-red-200">
        Request blood now →
      </Link>
    </div>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => ref.current && !ref.current.contains(e.target) && setMenu(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const donateTo = user?.role === 'donor' ? '/donor' : '/register/donor';
  const links = [
    ['/', 'Home', true],
    ['/find-blood', 'Find Blood'],
    [donateTo, 'Donate'],
    ['/camps', 'Camps'],
    ['/stock', 'Stock'],
    ['/about', 'About'],
  ];
  const linkCls = ({ isActive }) =>
    `border-b-2 px-1 py-1 text-sm font-semibold transition ${isActive ? 'border-red-600 text-red-700' : 'border-transparent text-red-900 hover:text-red-600'}`;

  const doLogout = () => {
    logout();
    setMenu(false);
    setOpen(false);
    toast.success('You have been logged out.');
    nav('/');
  };

  return (
    <header className="no-print sticky top-0 z-50 border-b border-red-200 bg-white/90 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav className="hidden items-center gap-6 lg:flex" aria-label="Main">
          {links.map(([to, label, end]) => (
            <NavLink key={label} to={to} end={end} className={linkCls}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/emergency" className="btn-primary px-3 sm:px-4">
            <Siren size={16} aria-hidden="true" /> <span className="hidden sm:inline">Emergency Request</span>
            <span className="sm:hidden">SOS</span>
          </Link>
          {user ? (
            <div className="relative hidden lg:block" ref={ref}>
              <button type="button" onClick={() => setMenu((m) => !m)} className="flex items-center gap-2 rounded-xl border border-red-200 bg-white px-2 py-1.5 hover:bg-red-50" aria-haspopup="menu" aria-expanded={menu} aria-label="Account menu">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">{initials(user.name)}</span>
                <ChevronDown size={14} aria-hidden="true" />
              </button>
              {menu && (
                <div role="menu" className="card absolute right-0 mt-2 w-56 animate-pop p-1.5">
                  <p className="truncate px-3 py-2 text-xs font-bold uppercase text-red-900/70">{user.name} · {user.role}</p>
                  <Link role="menuitem" to={homePathFor(user.role)} onClick={() => setMenu(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold hover:bg-red-50"><LayoutDashboard size={16} /> Dashboard</Link>
                  {user.role !== 'admin' && (
                    <Link role="menuitem" to={user.role === 'donor' ? '/donor/profile' : '/hospital'} onClick={() => setMenu(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold hover:bg-red-50"><UserCircle size={16} /> Profile</Link>
                  )}
                  <button role="menuitem" type="button" onClick={doLogout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold hover:bg-red-50"><LogOut size={16} /> Logout</button>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden items-center gap-2 lg:flex">
              <Link to="/login" className="btn-ghost">Login</Link>
              <Link to="/register/donor" className="btn-outline">Register</Link>
            </div>
          )}
          <button type="button" className="rounded-lg p-2 text-red-900 hover:bg-red-100 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu size={24} />
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-[70] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-red-950/60" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 flex h-full w-72 max-w-[85%] animate-fade-in flex-col bg-white p-5 shadow-lift">
            <div className="mb-4 flex items-center justify-between">
              <Logo size={30} />
              <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="rounded-lg p-1.5 hover:bg-red-100"><X size={22} /></button>
            </div>
            <nav className="flex flex-1 flex-col gap-1" aria-label="Mobile">
              {links.map(([to, label, end]) => (
                <NavLink key={label} to={to} end={end} onClick={() => setOpen(false)}
                  className={({ isActive }) => `rounded-xl px-3 py-2.5 font-semibold ${isActive ? 'bg-red-100 text-red-700 underline decoration-red-600 underline-offset-4' : 'text-red-900 hover:bg-red-50'}`}>
                  {label}
                </NavLink>
              ))}
            </nav>
            <div className="space-y-2 border-t border-red-100 pt-4">
              {user ? (
                <>
                  <Link to={homePathFor(user.role)} onClick={() => setOpen(false)} className="btn-outline w-full"><LayoutDashboard size={16} /> Dashboard</Link>
                  <button type="button" onClick={doLogout} className="btn-ghost w-full"><LogOut size={16} /> Logout</button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setOpen(false)} className="btn-outline w-full">Login</Link>
                  <Link to="/register/donor" onClick={() => setOpen(false)} className="btn-primary w-full">Register</Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
