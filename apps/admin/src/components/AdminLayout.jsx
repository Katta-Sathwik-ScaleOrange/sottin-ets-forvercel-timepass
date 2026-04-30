import { useLocation, useNavigate, NavLink } from 'react-router-dom';
import { clsx } from 'clsx';

const navItems = [
  { path: '/',                   label: 'Survey',            icon: '📊' },
  { path: '/routes',             label: 'Routes',            icon: '🗺️' },
  { path: '/inventory',          label: 'Inventory',         icon: '🎫' },
  { path: '/pending-locations',  label: 'Pending Locations', icon: '📍' },
  { path: '/apartments',         label: 'Apartments',        icon: '🏠' },
  { path: '/offices',            label: 'Offices',           icon: '🏢' },
  { path: '/ops',                label: 'Live Ops',          icon: '🚌' },
];

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-56 bg-surface-1 border-r border-surface-border flex flex-col z-20">
      <div className="px-5 py-5 border-b border-surface-border">
        <h1 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="w-8 h-8 bg-brand-500/20 rounded-lg flex items-center justify-center text-sm">🚌</span>
          TT Admin
        </h1>
      </div>
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-500/10 text-brand-500'
                  : 'text-slate-400 hover:bg-surface-2 hover:text-white'
              )
            }
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="px-5 py-4 border-t border-surface-border">
        <button
          onClick={() => { localStorage.removeItem('tt_admin_token'); window.location.href = '/login'; }}
          className="text-sm text-slate-500 hover:text-red-400 transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}

export function AdminLayout({ children }) {
  return (
    <div className="min-h-screen bg-surface-0">
      <Sidebar />
      <main className="ml-56 p-6">
        {children}
      </main>
    </div>
  );
}
