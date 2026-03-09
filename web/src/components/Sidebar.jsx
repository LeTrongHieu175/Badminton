import { NavLink } from 'react-router-dom';
import clsx from 'clsx';

const ADMIN_MENU = [
  { label: 'Dashboard', to: '/admin' },
  { label: 'Courts', to: '/admin/courts' },
  { label: 'Bookings', to: '/admin/bookings' },
  { label: 'Users', to: '/admin/users' },
  { label: 'Analytics', to: '/admin/analytics' },
  { label: 'AI Insights', to: '/admin/ai-insights' },
  { label: 'Settings', to: '/admin/settings' }
];

function Sidebar({ isOpen, onClose }) {
  return (
    <>
      <div
        className={clsx(
          'fixed inset-0 z-20 bg-slate-900/50 transition-opacity md:hidden',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
      />
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-30 w-72 border-r border-slate-200 bg-white px-4 py-6 transition-transform md:static md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className='mb-8 px-2'>
          <p className='text-xs uppercase tracking-[0.2em] text-brand-600'>Smart Badminton</p>
          <h2 className='mt-1 text-xl font-semibold text-slate-900'>Control Center</h2>
        </div>

        <nav className='space-y-1'>
          {ADMIN_MENU.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin'}
              onClick={onClose}
              className={({ isActive }) =>
                clsx(
                  'flex items-center rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}

export default Sidebar;
