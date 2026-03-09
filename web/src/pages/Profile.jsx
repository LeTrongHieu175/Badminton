import { useAuth } from '../contexts/AuthContext';

function Profile() {
  const { user } = useAuth();

  return (
    <div className='max-w-3xl space-y-6'>
      <section className='surface-card p-6'>
        <h2 className='section-title'>Profile</h2>
        <p className='subtle-copy mt-1'>Account details for booking and payment notifications.</p>

        <dl className='mt-6 grid gap-4 sm:grid-cols-2'>
          <div>
            <dt className='text-xs uppercase tracking-wide text-slate-500'>Username</dt>
            <dd className='mt-1 text-sm font-medium text-slate-900'>{user.username || user.name}</dd>
          </div>
          <div>
            <dt className='text-xs uppercase tracking-wide text-slate-500'>Mail</dt>
            <dd className='mt-1 text-sm font-medium text-slate-900'>{user.email}</dd>
          </div>
          <div>
            <dt className='text-xs uppercase tracking-wide text-slate-500'>Phone</dt>
            <dd className='mt-1 text-sm font-medium text-slate-900'>{user.phone || '-'}</dd>
          </div>
          <div>
            <dt className='text-xs uppercase tracking-wide text-slate-500'>Role</dt>
            <dd className='mt-1 text-sm font-medium text-slate-900'>{user.role}</dd>
          </div>
        </dl>
      </section>

      <section className='surface-card p-6'>
        <h3 className='text-base font-semibold text-slate-900'>Preferences</h3>
        <p className='mt-1 text-sm text-slate-600'>Email reminders and invoice delivery settings.</p>
        <div className='mt-4 space-y-2 text-sm text-slate-700'>
          <label className='flex items-center gap-2'>
            <input type='checkbox' defaultChecked className='h-4 w-4 rounded border-slate-300 text-brand-600' />
            Realtime booking notifications
          </label>
          <label className='flex items-center gap-2'>
            <input type='checkbox' defaultChecked className='h-4 w-4 rounded border-slate-300 text-brand-600' />
            Monthly usage report
          </label>
        </div>
      </section>
    </div>
  );
}

export default Profile;
