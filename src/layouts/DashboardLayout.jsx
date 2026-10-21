import { Outlet, Link, useNavigate } from 'react-router-dom';
import { LogOut, Home, Siren } from 'lucide-react';
import Logo from '../components/Logo';
import { Sidebar, BottomNav } from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { initials } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function DashboardLayout({ nav, title }) {
  const { user, logout } = useAuth();
  const go = useNavigate();
  return (
    <div className="min-h-screen pb-20 lg:pb-0">
      <header className="no-print sticky top-0 z-50 border-b border-red-200 bg-white/90 backdrop-blur-md">
        <div className="container-page flex h-16 items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Logo size={30} />
            <span className="hidden rounded-full bg-red-100 px-3 py-1 text-xs font-bold uppercase text-red-800 sm:inline">{title}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/emergency" className="btn-primary px-3"><Siren size={16} aria-hidden="true" /><span className="hidden sm:inline">Emergency Request</span></Link>
            <Link to="/" className="btn-ghost px-2" aria-label="Back to website"><Home size={18} /></Link>
            <span className="hidden items-center gap-2 text-sm font-semibold text-red-900 md:flex">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">{initials(user?.name)}</span>
              <span className="max-w-[160px] truncate">{user?.name}</span>
            </span>
            <button type="button" className="btn-outline btn-sm" onClick={() => { logout(); toast.success('Logged out.'); go('/'); }} aria-label="Logout">
              <LogOut size={14} /> <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>
      <div className="container-page flex gap-6 py-6">
        <Sidebar items={nav} />
        <main className="min-w-0 flex-1 animate-fade-in">
          <Outlet />
        </main>
      </div>
      <BottomNav items={nav} />
    </div>
  );
}
