import { useMemo } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function PublicLayout() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();

  const links = useMemo(() => {
    const base = [
      { label: 'Home', to: '/' },
      { label: 'Courts', to: '/courts' }
    ];

    if (!isAuthenticated) {
      return base;
    }

    base.push(
      { label: 'Dashboard', to: '/dashboard' },
      { label: 'History', to: '/bookings' },
      { label: 'Profile', to: '/profile' }
    );

    if (isAdmin) {
      base.push({ label: 'Admin', to: '/admin' });
    }

    return base;
  }, [isAuthenticated, isAdmin]);

  return (
    <div className='min-h-screen'>
      <header className='sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 backdrop-blur-sm'>
        <div className='mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8'>
          <div>
            <p className='text-xs uppercase tracking-[0.2em] text-brand-600'>Smart Badminton</p>
            <h1 className='text-lg font-semibold text-slate-900'>Court Management</h1>
          </div>

          <nav className='hidden items-center gap-2 md:flex'>
            {links.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-medium ${
                    isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {isAuthenticated ? (
            <div className='text-right'>
              <p className='text-sm font-semibold text-slate-900'>{user?.name}</p>
              <p className='text-xs uppercase text-slate-500'>{user?.role}</p>
              <button
                type='button'
                onClick={logout}
                className='mt-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100'
              >
                Logout
              </button>
            </div>
          ) : (
            <div className='text-right'>
              <p className='text-sm font-semibold text-slate-900'>Guest</p>
              <Link to='/' className='text-xs uppercase text-brand-700 hover:underline'>
                Login / Register
              </Link>
            </div>
          )}
        </div>
      </header>

      <main className='mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8'>
        <Outlet />
      </main>
    </div>
  );
}

export default PublicLayout;
