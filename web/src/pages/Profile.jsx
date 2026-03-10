import { useAuth } from '../contexts/AuthContext';
import { formatRoleLabel } from '../utils/formatters';

function Profile() {
  const { user } = useAuth();

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
        <h3 className='text-base font-semibold text-slate-900'>Tùy chọn</h3>
        <p className='mt-1 text-sm text-slate-600'>Cài đặt nhắc nhở và nhận thông báo hệ thống.</p>
        <div className='mt-4 space-y-2 text-sm text-slate-700'>
          <label className='flex items-center gap-2'>
            <input type='checkbox' defaultChecked className='h-4 w-4 rounded border-slate-300 text-brand-600' />
            Thông báo đặt sân thời gian thực
          </label>
          <label className='flex items-center gap-2'>
            <input type='checkbox' defaultChecked className='h-4 w-4 rounded border-slate-300 text-brand-600' />
            Báo cáo sử dụng hàng tháng
          </label>
        </div>
      </section>
    </div>
  );
}

export default Profile;
