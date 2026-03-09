import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { mockStats } from '../services/mockData';
import { useAuth } from '../contexts/AuthContext';

const AUTH_MODE = {
  LOGIN: 'login',
  REGISTER: 'register'
};

function extractErrorMessage(error) {
  return error?.response?.data?.error?.message || error?.response?.data?.message || 'Request failed, please try again.';
}

function Home() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin, isSubmitting, login, register } = useAuth();

  const [authMode, setAuthMode] = useState(AUTH_MODE.LOGIN);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loginForm, setLoginForm] = useState({
    identifier: '',
    password: ''
  });
  const [registerForm, setRegisterForm] = useState({
    username: '',
    mail: '',
    phone: '',
    password: ''
  });

  const welcomeAction = useMemo(() => {
    if (!isAuthenticated) {
      return null;
    }

    return isAdmin ? '/admin' : '/dashboard';
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
      setErrorMessage(extractErrorMessage(error));
    }
  };

  const handleRegisterSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');

    try {
      const registeredUser = await register(registerForm);
      setIsAuthModalOpen(false);
      setRegisterForm({ username: '', mail: '', phone: '', password: '' });
      navigate(registeredUser?.role === 'admin' ? '/admin' : '/dashboard');
    } catch (error) {
      setErrorMessage(extractErrorMessage(error));
    }
  };

  return (
    <div className='space-y-8'>
      <section className='surface-card overflow-hidden p-8'>
        <div className='grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center'>
          <div>
            <p className='text-sm font-semibold uppercase tracking-[0.2em] text-brand-600'>Smart Badminton</p>
            <h2 className='mt-4 text-4xl font-semibold tracking-tight text-slate-900'>
              Manage courts, bookings, and payments from one clear control panel.
            </h2>
            <p className='mt-4 max-w-2xl text-slate-600'>
              Built for high-volume badminton facilities with realtime slot updates, concurrency-safe booking, and
              analytics-ready data.
            </p>
            <div className='mt-6 flex flex-wrap gap-3'>
              <Link
                to='/courts'
                className='rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700'
              >
                Explore Courts
              </Link>

              {isAuthenticated ? (
                <Link
                  to={welcomeAction}
                  className='rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100'
                >
                  {isAdmin ? 'Open Admin Dashboard' : 'Go to User Dashboard'}
                </Link>
              ) : (
                <>
                  <button
                    type='button'
                    onClick={() => openAuthModal(AUTH_MODE.LOGIN)}
                    className='rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100'
                  >
                    Login
                  </button>
                  <button
                    type='button'
                    onClick={() => openAuthModal(AUTH_MODE.REGISTER)}
                    className='rounded-xl border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100'
                  >
                    Register
                  </button>
                </>
              )}
            </div>
            {isAuthenticated ? (
              <p className='mt-3 text-sm text-slate-500'>
                Logged in as <span className='font-semibold'>{user?.name}</span> ({user?.role}).
              </p>
            ) : (
              <p className='mt-3 text-sm text-slate-500'>
                New user registration requires: username, password, phone, and mail.
              </p>
            )}
          </div>

          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='rounded-xl bg-slate-900 p-5 text-white'>
              <p className='text-xs uppercase tracking-wide text-slate-300'>Revenue (YTD)</p>
              <p className='mt-2 text-3xl font-semibold'>${mockStats.totalRevenue.toLocaleString()}</p>
            </div>
            <div className='rounded-xl bg-brand-600 p-5 text-white'>
              <p className='text-xs uppercase tracking-wide text-brand-100'>Total Bookings</p>
              <p className='mt-2 text-3xl font-semibold'>{mockStats.totalBookings.toLocaleString()}</p>
            </div>
            <div className='rounded-xl border border-slate-200 bg-white p-5'>
              <p className='text-xs uppercase tracking-wide text-slate-500'>Active Users</p>
              <p className='mt-2 text-3xl font-semibold text-slate-900'>{mockStats.activeUsers.toLocaleString()}</p>
            </div>
            <div className='rounded-xl border border-slate-200 bg-white p-5'>
              <p className='text-xs uppercase tracking-wide text-slate-500'>Utilization</p>
              <p className='mt-2 text-3xl font-semibold text-slate-900'>{mockStats.avgUtilization}%</p>
            </div>
          </div>
        </div>
      </section>

      <section className='grid gap-4 md:grid-cols-3'>
        <div className='surface-card p-6'>
          <h3 className='text-lg font-semibold text-slate-900'>Realtime Booking</h3>
          <p className='mt-2 text-sm text-slate-600'>
            Slot updates stream instantly so frontdesk and customers stay synced.
          </p>
        </div>
        <div className='surface-card p-6'>
          <h3 className='text-lg font-semibold text-slate-900'>Payment Hooks</h3>
          <p className='mt-2 text-sm text-slate-600'>
            Capture payment lifecycle and convert locked reservations to confirmed bookings safely.
          </p>
        </div>
        <div className='surface-card p-6'>
          <h3 className='text-lg font-semibold text-slate-900'>SaaS Analytics</h3>
          <p className='mt-2 text-sm text-slate-600'>
            Monitor revenue trends, court usage, and peak-hour demand in one dashboard.
          </p>
        </div>
      </section>

      {isAuthModalOpen ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4'>
          <div className='w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-panel'>
            <div className='mb-5 flex items-center justify-between gap-3'>
              <h3 className='text-xl font-semibold text-slate-900'>
                {authMode === AUTH_MODE.LOGIN ? 'Login' : 'Create Account'}
              </h3>
              <button
                type='button'
                className='rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100'
                onClick={closeAuthModal}
              >
                Close
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
                  <label className='mb-1 block text-sm font-medium text-slate-700' htmlFor='identifier'>
                    Username or Mail
                  </label>
                  <input
                    id='identifier'
                    type='text'
                    required
                    value={loginForm.identifier}
                    onChange={(event) => setLoginForm((prev) => ({ ...prev, identifier: event.target.value }))}
                    className='w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400'
                    placeholder='admin or admin@smartbadminton.com'
                  />
                </div>

                <div>
                  <label className='mb-1 block text-sm font-medium text-slate-700' htmlFor='password'>
                    Password
                  </label>
                  <input
                    id='password'
                    type='password'
                    required
                    value={loginForm.password}
                    onChange={(event) => setLoginForm((prev) => ({ ...prev, password: event.target.value }))}
                    className='w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400'
                    placeholder='Your password'
                  />
                </div>

                <button
                  type='submit'
                  disabled={isSubmitting}
                  className='w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70'
                >
                  {isSubmitting ? 'Logging in...' : 'Login'}
                </button>

                <p className='text-center text-sm text-slate-600'>
                  No account yet?{' '}
                  <button
                    type='button'
                    className='font-semibold text-brand-700 hover:underline'
                    onClick={() => setAuthMode(AUTH_MODE.REGISTER)}
                  >
                    Register now
                  </button>
                </p>
              </form>
            ) : (
              <form className='space-y-4' onSubmit={handleRegisterSubmit}>
                <div>
                  <label className='mb-1 block text-sm font-medium text-slate-700' htmlFor='register-username'>
                    Username
                  </label>
                  <input
                    id='register-username'
                    type='text'
                    required
                    value={registerForm.username}
                    onChange={(event) => setRegisterForm((prev) => ({ ...prev, username: event.target.value }))}
                    className='w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400'
                    placeholder='your_username'
                  />
                </div>

                <div>
                  <label className='mb-1 block text-sm font-medium text-slate-700' htmlFor='register-mail'>
                    Mail
                  </label>
                  <input
                    id='register-mail'
                    type='email'
                    required
                    value={registerForm.mail}
                    onChange={(event) => setRegisterForm((prev) => ({ ...prev, mail: event.target.value }))}
                    className='w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400'
                    placeholder='you@example.com'
                  />
                </div>

                <div>
                  <label className='mb-1 block text-sm font-medium text-slate-700' htmlFor='register-phone'>
                    Phone
                  </label>
                  <input
                    id='register-phone'
                    type='text'
                    required
                    value={registerForm.phone}
                    onChange={(event) => setRegisterForm((prev) => ({ ...prev, phone: event.target.value }))}
                    className='w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400'
                    placeholder='0901234567'
                  />
                </div>

                <div>
                  <label className='mb-1 block text-sm font-medium text-slate-700' htmlFor='register-password'>
                    Password
                  </label>
                  <input
                    id='register-password'
                    type='password'
                    required
                    minLength={6}
                    value={registerForm.password}
                    onChange={(event) => setRegisterForm((prev) => ({ ...prev, password: event.target.value }))}
                    className='w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400'
                    placeholder='At least 6 characters'
                  />
                </div>

                <button
                  type='submit'
                  disabled={isSubmitting}
                  className='w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70'
                >
                  {isSubmitting ? 'Creating account...' : 'Register'}
                </button>

                <p className='text-center text-sm text-slate-600'>
                  Already have an account?{' '}
                  <button
                    type='button'
                    className='font-semibold text-brand-700 hover:underline'
                    onClick={() => setAuthMode(AUTH_MODE.LOGIN)}
                  >
                    Login
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

export default Home;
