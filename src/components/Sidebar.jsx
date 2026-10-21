import { NavLink } from 'react-router-dom';

/** Desktop: vertical sidebar. Mobile: fixed bottom nav (horizontally scrollable). */
export function Sidebar({ items }) {
  return (
    <aside className="no-print hidden w-60 shrink-0 lg:block">
      <nav className="card sticky top-24 space-y-1 p-3" aria-label="Dashboard">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive ? 'bg-red-600 text-white shadow-soft' : 'text-red-900 hover:bg-red-100'}`}>
            <Icon size={18} aria-hidden="true" /> {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export function BottomNav({ items }) {
  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-red-200 bg-white/95 backdrop-blur lg:hidden" aria-label="Dashboard">
      <div className="flex overflow-x-auto px-1">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) => `flex min-w-[76px] flex-1 flex-col items-center gap-0.5 px-2 py-2 text-[11px] font-semibold ${isActive ? 'text-red-700' : 'text-red-900/70'}`}>
            {({ isActive }) => (
              <>
                <span className={`rounded-full px-3 py-1 ${isActive ? 'bg-red-100' : ''}`}><Icon size={18} aria-hidden="true" /></span>
                <span className="whitespace-nowrap">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
