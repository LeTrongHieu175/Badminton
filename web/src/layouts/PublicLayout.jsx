import { useMemo, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { formatRoleLabel } from '../utils/formatters';
import { getApiErrorMessage } from '../utils/errors';

const AUTH_MODE = {
  LOGIN: 'login',
  REGISTER: 'register'
};

function PublicLayout() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin, isSubmitting, login, register, logout } = useAuth();
  const [authMode, setAuthMode] = useState(AUTH_MODE.LOGIN);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loginForm, setLoginForm] = useState({
    identifier: '',
    password: ''
  });
  const [registerForm, setRegisterForm] = useState({
    username: '',
    email: '',
    phone: '',
    password: ''
  });

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

  const openAuthModal = (mode) => {
    setErrorMessage('');
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setErrorMessage('');
    setIsAuthModalOpen(false);
  };

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');

    try {
      const loggedUser = await login(loginForm);
      setIsAuthModalOpen(false);
      setLoginForm({ identifier: '', password: '' });
      navigate(loggedUser?.role === 'admin' ? '/admin' : '/dashboard');
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Đăng nhập thất bại, vui lòng thử lại.'));
    }
  };

  const handleRegisterSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');

    try {
      const registeredUser = await register(registerForm);
      setIsAuthModalOpen(false);
      setRegisterForm({ username: '', email: '', phone: '', password: '' });
      navigate(registeredUser?.role === 'admin' ? '/admin' : '/dashboard');
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Tạo tài khoản thất bại, vui lòng thử lại.'));
    }
  };

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
              <button
                type='button'
                onClick={() => openAuthModal(AUTH_MODE.LOGIN)}
                className='text-xs uppercase text-brand-700 hover:underline'
              >
                Đăng nhập / Đăng ký
              </button>
            </div>
          )}
        </div>
      </header>

      <main className='mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8'>
        <Outlet />
      </main>

      {isAuthModalOpen ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4'>
          <div className='w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-panel'>
            <div className='mb-5 flex items-center justify-between gap-3'>
              <h3 className='text-xl font-semibold text-slate-900'>
                {authMode === AUTH_MODE.LOGIN ? 'Đăng nhập' : 'Tạo tài khoản'}
              </h3>
              <button
                type='button'
                className='rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100'
                onClick={closeAuthModal}
              >
                Đóng
              </button>
            </div>

            {errorMessage ? (
              <div className='mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700'>
                {errorMessage}
              </div>
            ) : null}

            {authMode === AUTH_MODE.LOGIN ? (
              <form className='space-y-4' onSubmit={handleLoginSubmit}>
                <div>
                  <label className='mb-1 block text-sm font-medium text-slate-700' htmlFor='layout-identifier'>
                    Username hoặc Email
                  </label>
                  <input
                    id='layout-identifier'
                    type='text'
                    required
                    value={loginForm.identifier}
                    onChange={(event) => setLoginForm((prev) => ({ ...prev, identifier: event.target.value }))}
                    className='w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400'
                    placeholder='admin hoặc admin@smartbadminton.com'
                  />
                </div>

                <div>
                  <label className='mb-1 block text-sm font-medium text-slate-700' htmlFor='layout-password'>
                    Mật khẩu
                  </label>
                  <input
                    id='layout-password'
                    type='password'
                    required
                    value={loginForm.password}
                    onChange={(event) => setLoginForm((prev) => ({ ...prev, password: event.target.value }))}
                    className='w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400'
                    placeholder='Nhập mật khẩu'
                  />
                </div>

                <button
                  type='submit'
                  disabled={isSubmitting}
                  className='w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70'
                >
                  {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
                </button>

                <p className='text-center text-sm text-slate-600'>
                  Chưa có tài khoản?{' '}
                  <button
                    type='button'
                    className='font-semibold text-brand-700 hover:underline'
                    onClick={() => setAuthMode(AUTH_MODE.REGISTER)}
                  >
                    Đăng ký ngay
                  </button>
                </p>
              </form>
            ) : (
              <form className='space-y-4' onSubmit={handleRegisterSubmit}>
                <div>
                  <label className='mb-1 block text-sm font-medium text-slate-700' htmlFor='layout-register-username'>
                    Username
                  </label>
                  <input
                    id='layout-register-username'
                    type='text'
                    required
                    value={registerForm.username}
                    onChange={(event) => setRegisterForm((prev) => ({ ...prev, username: event.target.value }))}
                    className='w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400'
                    placeholder='ten_dang_nhap'
                  />
                </div>

                <div>
                  <label className='mb-1 block text-sm font-medium text-slate-700' htmlFor='layout-register-email'>
                    Email
                  </label>
                  <input
                    id='layout-register-email'
                    type='email'
                    required
                    value={registerForm.email}
                    onChange={(event) => setRegisterForm((prev) => ({ ...prev, email: event.target.value }))}
                    className='w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400'
                    placeholder='ban@example.com'
                  />
                </div>

                <div>
                  <label className='mb-1 block text-sm font-medium text-slate-700' htmlFor='layout-register-phone'>
                    Số điện thoại
                  </label>
                  <input
                    id='layout-register-phone'
                    type='text'
                    required
                    value={registerForm.phone}
                    onChange={(event) => setRegisterForm((prev) => ({ ...prev, phone: event.target.value }))}
                    className='w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400'
                    placeholder='09xxxxxxxx'
                  />
                </div>

                <div>
                  <label className='mb-1 block text-sm font-medium text-slate-700' htmlFor='layout-register-password'>
                    Mật khẩu
                  </label>
                  <input
                    id='layout-register-password'
                    type='password'
                    required
                    value={registerForm.password}
                    onChange={(event) => setRegisterForm((prev) => ({ ...prev, password: event.target.value }))}
                    className='w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400'
                    placeholder='Tối thiểu 6 ký tự'
                  />
                </div>

                <button
                  type='submit'
                  disabled={isSubmitting}
                  className='w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70'
                >
                  {isSubmitting ? 'Đang tạo tài khoản...' : 'Đăng ký'}
                </button>

                <p className='text-center text-sm text-slate-600'>
                  Đã có tài khoản?{' '}
                  <button
                    type='button'
                    className='font-semibold text-brand-700 hover:underline'
                    onClick={() => setAuthMode(AUTH_MODE.LOGIN)}
                  >
                    Đăng nhập
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default PublicLayout;
