import { useMemo } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { formatRoleLabel } from '../utils/formatters';

function PublicLayout() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();

  const links = useMemo(() => {
    if (!isAuthenticated) {
      return [{ label: 'Trang chủ', to: '/' }];
    }

    const base = [
      { label: 'Dashboard', to: '/dashboard' },
      { label: 'Đặt sân', to: '/courts' },
      { label: 'Lịch sử đặt sân', to: '/bookings' },
      { label: 'Cá nhân', to: '/profile' }
    ];

    if (isAdmin) {
      base.push({ label: 'Quản trị', to: '/admin' });
    }

    return base;
  }, [isAuthenticated, isAdmin]);

  return (
    <div className='min-h-screen'>
      <header className='sticky top-0 z-20 border-b border-slate-200/70 bg-white/85 backdrop-blur-sm'>
        <div className='mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8'>
          <div>
            <p className='text-xs uppercase tracking-[0.2em] text-brand-600'>Smart Badminton</p>
            <h1 className='text-lg font-semibold text-slate-900'>Hệ thống quản lý sân cầu lông</h1>
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
              <p className='text-xs uppercase text-slate-500'>{formatRoleLabel(user?.role)}</p>
              <button
                type='button'
                onClick={logout}
                className='mt-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100'
              >
                Đăng xuất
              </button>
            </div>
          ) : (
            <div className='text-right'>
              <p className='text-sm font-semibold text-slate-900'>Khách</p>
              <Link to='/' className='text-xs uppercase text-brand-700 hover:underline'>
                Đăng nhập / Đăng ký
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
