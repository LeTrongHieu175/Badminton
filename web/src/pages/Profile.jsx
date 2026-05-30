import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getApiErrorMessage } from '../utils/errors';
import { formatRoleLabel } from '../utils/formatters';

function Profile() {
  const { user, updateProfile, isSubmitting } = useAuth();
  const [form, setForm] = useState({
    username: '',
    fullName: '',
    phone: ''
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setForm({
      username: user?.username || '',
      fullName: user?.fullName || '',
      phone: user?.phone || ''
    });
  }, [user]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    try {
      await updateProfile(form);
      setMessage('Đã cập nhật thông tin cá nhân.');
    } catch (submitError) {
      setError(getApiErrorMessage(submitError, 'Không thể cập nhật thông tin cá nhân.'));
    }
  };

  return (
    <div className='max-w-3xl space-y-6'>
      <section className='surface-card p-6'>
        <h2 className='section-title'>Hồ sơ cá nhân</h2>
        <p className='subtle-copy mt-1'>Thông tin tài khoản dùng cho đặt sân và nhận thông báo.</p>

        <dl className='mt-6 grid gap-4 sm:grid-cols-2'>
          <div>
            <dt className='text-xs uppercase tracking-wide text-slate-500'>Username</dt>
            <dd className='mt-1 text-sm font-medium text-slate-900'>{user?.username || '-'}</dd>
          </div>
          <div>
            <dt className='text-xs uppercase tracking-wide text-slate-500'>Họ và tên</dt>
            <dd className='mt-1 text-sm font-medium text-slate-900'>{user?.fullName || user?.name || '-'}</dd>
          </div>
          <div>
            <dt className='text-xs uppercase tracking-wide text-slate-500'>Email</dt>
            <dd className='mt-1 text-sm font-medium text-slate-900'>{user?.email || '-'}</dd>
          </div>
          <div>
            <dt className='text-xs uppercase tracking-wide text-slate-500'>Số điện thoại</dt>
            <dd className='mt-1 text-sm font-medium text-slate-900'>{user?.phone || '-'}</dd>
          </div>
          <div>
            <dt className='text-xs uppercase tracking-wide text-slate-500'>Vai trò</dt>
            <dd className='mt-1 text-sm font-medium text-slate-900'>{formatRoleLabel(user?.role)}</dd>
          </div>
          <div>
            <dt className='text-xs uppercase tracking-wide text-slate-500'>Trạng thái</dt>
            <dd className='mt-1 text-sm font-medium text-slate-900'>
              {user?.isActive ? 'Đang hoạt động' : 'Đã vô hiệu hóa'}
            </dd>
          </div>
        </dl>
      </section>

      <section className='surface-card p-6'>
        <h3 className='text-base font-semibold text-slate-900'>Chỉnh sửa thông tin</h3>
        <p className='mt-1 text-sm text-slate-600'>Bạn có thể đổi username, họ tên và số điện thoại trực tiếp tại đây.</p>

        <form className='mt-5 space-y-4' onSubmit={handleSubmit}>
          <div className='grid gap-4 sm:grid-cols-2'>
            <label className='block'>
              <span className='mb-1 block text-sm font-medium text-slate-700'>Username</span>
              <input
                type='text'
                value={form.username}
                onChange={(event) => handleChange('username', event.target.value)}
                className='w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200'
                placeholder='Nhập username mới'
                disabled={isSubmitting}
              />
            </label>
            <label className='block'>
              <span className='mb-1 block text-sm font-medium text-slate-700'>Số điện thoại</span>
              <input
                type='tel'
                value={form.phone}
                onChange={(event) => handleChange('phone', event.target.value)}
                className='w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200'
                placeholder='Nhập số điện thoại mới'
                disabled={isSubmitting}
              />
            </label>
          </div>

          <label className='block'>
            <span className='mb-1 block text-sm font-medium text-slate-700'>Họ và tên</span>
            <input
              type='text'
              value={form.fullName}
              onChange={(event) => handleChange('fullName', event.target.value)}
              className='w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200'
              placeholder='Nhập họ và tên'
              disabled={isSubmitting}
            />
          </label>

          <div>
            <span className='mb-1 block text-sm font-medium text-slate-700'>Email</span>
            <input
              type='email'
              value={user?.email || ''}
              className='w-full cursor-not-allowed rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-500 outline-none'
              disabled
              readOnly
            />
          </div>

          {error ? <p className='text-sm font-medium text-rose-600'>{error}</p> : null}
          {message ? <p className='text-sm font-medium text-emerald-600'>{message}</p> : null}

          <div className='flex justify-end'>
            <button
              type='submit'
              className='rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default Profile;
