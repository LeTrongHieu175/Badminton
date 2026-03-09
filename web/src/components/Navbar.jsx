import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Navbar({ title, onMenuToggle }) {
  const { user, isAdmin, logout } = useAuth();

  return (
    <header className='sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur-sm sm:px-6'>
      <div className='flex items-center gap-3'>
        {onMenuToggle ? (
          <button
            type='button'
            className='rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-700 md:hidden'
            onClick={onMenuToggle}
          >
            Menu
          </button>
        ) : null}
        <div>
          <p className='text-sm font-semibold text-slate-900'>{title}</p>
          <p className='text-xs text-slate-500'>Welcome back, {user?.name || 'User'}</p>
        </div>
      </div>

      <div className='flex items-center gap-2'>
        <Link
          to={isAdmin ? '/admin' : '/dashboard'}
          className='hidden rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 sm:inline-block'
        >
          {isAdmin ? 'Admin' : 'User'} View
        </Link>
        <button
          type='button'
          onClick={logout}
          className='rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700'
        >
          Logout
        </button>
      </div>
    </header>
  );
}

export default Navbar;
