import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { formatRoleLabel } from '../utils/formatters';
import { getApiErrorMessage } from '../utils/errors';

const AUTH_MODE = {
  LOGIN: 'login',
  REGISTER: 'register'
};

const FEATURE_SECTIONS = [
  {
    title: 'Đặt sân nhanh trong vài giây',
    description:
      'Khách hàng chọn ngày, xem khung giờ còn trống theo thời gian thực và chốt lịch ngay trên một màn hình.',
    image:
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1200&q=80'
  },
  {
    title: 'Vận hành tập trung cho quản trị',
    description:
      'Quản trị viên theo dõi sân, slot, người dùng và toàn bộ đơn đặt sân trong dashboard tập trung.',
    image:
      'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80'
  },
  {
    title: 'Gợi ý AI để tăng tỷ lệ lấp đầy',
    description:
      'Hệ thống đề xuất khung giờ phù hợp theo hành vi người chơi, giúp tăng khả năng đặt thành công.',
    image:
      'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80'
  }
];

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
    email: '',
    phone: '',
    password: ''
  });

  const welcomeAction = useMemo(() => {
    if (!isAuthenticated) {
      return '/';
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
    <div className='space-y-10'>
      <section className='overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-panel'>
        <div className='grid gap-8 lg:grid-cols-[1.2fr_1fr]'>
          <div className='p-8 sm:p-10 lg:p-12'>
            <p className='text-xs font-semibold uppercase tracking-[0.24em] text-brand-600'>Smart Badminton System</p>
            <h2 className='mt-4 text-4xl font-bold leading-tight text-slate-900 sm:text-5xl'>
              Nền tảng vận hành sân cầu lông theo chuẩn thương mại
            </h2>
            <p className='mt-4 max-w-2xl text-base text-slate-600'>
              Quản lý lịch đặt, người dùng, doanh thu và gợi ý AI trên một hệ thống thống nhất cho cả khách hàng và
              quản trị viên.
            </p>

            <div className='mt-8 flex flex-wrap gap-3'>
              {isAuthenticated ? (
                <Link
                  to={isAdmin ? '/admin' : '/courts'}
                  className='rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700'
                >
                  {isAdmin ? 'Vào trang quản trị' : 'Bắt đầu đặt sân'}
                </Link>
              ) : (
                <>
                  <button
                    type='button'
                    onClick={() => openAuthModal(AUTH_MODE.LOGIN)}
                    className='rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700'
                  >
                    Đăng nhập
                  </button>
                  <button
                    type='button'
                    onClick={() => openAuthModal(AUTH_MODE.REGISTER)}
                    className='rounded-xl border border-brand-200 bg-brand-50 px-5 py-3 text-sm font-semibold text-brand-700 hover:bg-brand-100'
                  >
                    Tạo tài khoản
                  </button>
                </>
              )}

              <Link
                to={isAuthenticated ? welcomeAction : '#'}
                className='rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100'
              >
                {isAuthenticated ? 'Đi đến dashboard' : 'Giải pháp cho doanh nghiệp'}
              </Link>
            </div>

            {isAuthenticated ? (
              <p className='mt-4 text-sm text-slate-500'>
                Bạn đang đăng nhập với tài khoản <span className='font-semibold'>{user?.name}</span> ({formatRoleLabel(user?.role)}).
              </p>
            ) : (
              <p className='mt-4 text-sm text-slate-500'>
                Đăng ký nhanh với username, email, số điện thoại và mật khẩu.
              </p>
            )}
          </div>

          <div
            className='min-h-[280px] bg-cover bg-center'
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1622279457486-28f8f9b2a47c?auto=format&fit=crop&w=1400&q=80')"
            }}
          />
        </div>
      </section>

      <section className='grid gap-5 md:grid-cols-3'>
        {FEATURE_SECTIONS.map((feature) => (
          <article key={feature.title} className='overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-panel'>
            <img src={feature.image} alt={feature.title} className='h-40 w-full object-cover' loading='lazy' />
            <div className='p-5'>
              <h3 className='text-lg font-semibold text-slate-900'>{feature.title}</h3>
              <p className='mt-2 text-sm text-slate-600'>{feature.description}</p>
            </div>
          </article>
        ))}
      </section>

      <section className='rounded-2xl border border-slate-200 bg-white p-6 shadow-panel sm:p-8'>
        <div className='grid gap-6 md:grid-cols-3'>
          <div>
            <h3 className='text-base font-semibold text-slate-900'>Chính sách vận hành</h3>
            <p className='mt-2 text-sm text-slate-600'>
              Chính sách đặt sân, hoàn hủy, bảo mật dữ liệu và điều khoản sử dụng được áp dụng cho toàn hệ thống.
            </p>
          </div>
          <div>
            <h3 className='text-base font-semibold text-slate-900'>Điều khoản & quyền riêng tư</h3>
            <p className='mt-2 text-sm text-slate-600'>
              Tất cả thông tin cá nhân được xử lý theo quy định bảo vệ dữ liệu hiện hành và chỉ phục vụ vận hành dịch vụ.
            </p>
          </div>
          <div>
            <h3 className='text-base font-semibold text-slate-900'>Liên hệ hỗ trợ</h3>
            <p className='mt-2 text-sm text-slate-600'>Hotline: 1900 6868</p>
            <p className='text-sm text-slate-600'>Email: support@smartbadminton.vn</p>
            <p className='text-sm text-slate-600'>Địa chỉ: 123 Nguyễn Huệ, Quận 1, TP.HCM</p>
          </div>
        </div>
      </section>

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
                  <label className='mb-1 block text-sm font-medium text-slate-700' htmlFor='identifier'>
                    Username hoặc Email
                  </label>
                  <input
                    id='identifier'
                    type='text'
                    required
                    value={loginForm.identifier}
                    onChange={(event) => setLoginForm((prev) => ({ ...prev, identifier: event.target.value }))}
                    className='w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400'
                    placeholder='admin hoặc admin@smartbadminton.com'
                  />
                </div>

                <div>
                  <label className='mb-1 block text-sm font-medium text-slate-700' htmlFor='password'>
                    Mật khẩu
                  </label>
                  <input
                    id='password'
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
                    placeholder='ten_dang_nhap'
                  />
                </div>

                <div>
                  <label className='mb-1 block text-sm font-medium text-slate-700' htmlFor='register-email'>
                    Email
                  </label>
                  <input
                    id='register-email'
                    type='email'
                    required
                    value={registerForm.email}
                    onChange={(event) => setRegisterForm((prev) => ({ ...prev, email: event.target.value }))}
                    className='w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400'
                    placeholder='ban@example.com'
                  />
                </div>

                <div>
                  <label className='mb-1 block text-sm font-medium text-slate-700' htmlFor='register-phone'>
                    Số điện thoại
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
                    Mật khẩu
                  </label>
                  <input
                    id='register-password'
                    type='password'
                    required
                    minLength={6}
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

export default Home;
