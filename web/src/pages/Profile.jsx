import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getApiErrorMessage } from '../utils/errors';
import { formatRoleLabel } from '../utils/formatters';

function Profile() {
  const { user, updateProfile, changePassword, isSubmitting } = useAuth();
  const [activeTab, setActiveTab] = useState('edit');
  const [form, setForm] = useState({
    username: '',
    fullName: '',
    phone: ''
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');

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

  const handlePasswordChange = (field, value) => {
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setProfileMessage('');
    setProfileError('');

    try {
      await updateProfile(form);
      setProfileMessage('Đã cập nhật thông tin cá nhân.');
    } catch (submitError) {
      setProfileError(getApiErrorMessage(submitError, 'Không thể cập nhật thông tin cá nhân.'));
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordMessage('');
    setPasswordError('');

    try {
      await changePassword(passwordForm);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setPasswordMessage('Đã cập nhật mật khẩu.');
    } catch (submitError) {
      setPasswordError(getApiErrorMessage(submitError, 'Không thể đổi mật khẩu.'));
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
        <div className='flex flex-wrap gap-3'>
          <button
            type='button'
            onClick={() => setActiveTab('edit')}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeTab === 'edit'
                ? 'bg-slate-900 text-white'
                : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300'
            }`}
          >
            Chỉnh sửa
          </button>
          <button
            type='button'
            onClick={() => setActiveTab('password')}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeTab === 'password'
                ? 'bg-slate-900 text-white'
                : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300'
            }`}
          >
            Đổi mật khẩu
          </button>
        </div>

        {activeTab === 'edit' ? (
          <>
            <h3 className='mt-5 text-base font-semibold text-slate-900'>Chỉnh sửa thông tin</h3>
            <p className='mt-1 text-sm text-slate-600'>Bạn có thể đổi username, họ tên và số điện thoại trực tiếp tại đây.</p>

            <form className='mt-5 space-y-4' onSubmit={handleProfileSubmit}>
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

              {profileError ? <p className='text-sm font-medium text-rose-600'>{profileError}</p> : null}
              {profileMessage ? <p className='text-sm font-medium text-emerald-600'>{profileMessage}</p> : null}

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
          </>
        ) : (
          <>
            <h3 className='mt-5 text-base font-semibold text-slate-900'>Đổi mật khẩu</h3>
            <p className='mt-1 text-sm text-slate-600'>Nhập mật khẩu hiện tại và mật khẩu mới để cập nhật bảo mật tài khoản.</p>

            <form className='mt-5 space-y-4' onSubmit={handlePasswordSubmit}>
              <label className='block'>
                <span className='mb-1 block text-sm font-medium text-slate-700'>Mật khẩu hiện tại</span>
                <input
                  type='password'
                  value={passwordForm.currentPassword}
                  onChange={(event) => handlePasswordChange('currentPassword', event.target.value)}
                  className='w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200'
                  placeholder='Nhập mật khẩu hiện tại'
                  disabled={isSubmitting}
                />
              </label>

              <div className='grid gap-4 sm:grid-cols-2'>
                <label className='block'>
                  <span className='mb-1 block text-sm font-medium text-slate-700'>Mật khẩu mới</span>
                  <input
                    type='password'
                    value={passwordForm.newPassword}
                    onChange={(event) => handlePasswordChange('newPassword', event.target.value)}
                    className='w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200'
                    placeholder='Tối thiểu 6 ký tự'
                    disabled={isSubmitting}
                  />
                </label>
                <label className='block'>
                  <span className='mb-1 block text-sm font-medium text-slate-700'>Xác nhận mật khẩu mới</span>
                  <input
                    type='password'
                    value={passwordForm.confirmPassword}
                    onChange={(event) => handlePasswordChange('confirmPassword', event.target.value)}
                    className='w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200'
                    placeholder='Nhập lại mật khẩu mới'
                    disabled={isSubmitting}
                  />
                </label>
              </div>

              {passwordError ? <p className='text-sm font-medium text-rose-600'>{passwordError}</p> : null}
              {passwordMessage ? <p className='text-sm font-medium text-emerald-600'>{passwordMessage}</p> : null}

              <div className='flex justify-end'>
                <button
                  type='submit'
                  className='rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
                </button>
              </div>
            </form>
          </>
        )}
      </section>
    </div>
  );
}

export default Profile;
