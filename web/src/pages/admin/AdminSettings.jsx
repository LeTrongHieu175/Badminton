function AdminSettings() {
  return (
    <div className='max-w-2xl space-y-4'>
      <section className='surface-card p-5'>
        <h2 className='text-xl font-semibold text-slate-900'>Settings</h2>
        <p className='mt-1 text-sm text-slate-600'>Configure booking, notifications, and payment behavior.</p>

        <form className='mt-5 space-y-4'>
          <label className='block'>
            <span className='text-sm font-medium text-slate-700'>Default currency</span>
            <select className='mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm'>
              <option>USD</option>
              <option>VND</option>
              <option>EUR</option>
            </select>
          </label>

          <label className='block'>
            <span className='text-sm font-medium text-slate-700'>Booking lock timeout (minutes)</span>
            <input type='number' min='1' defaultValue='5' className='mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm' />
          </label>

          <label className='flex items-center gap-2 text-sm text-slate-700'>
            <input type='checkbox' className='h-4 w-4 rounded border-slate-300 text-brand-600' defaultChecked />
            Enable realtime slot updates
          </label>

          <button
            type='button'
            className='rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700'
          >
            Save settings
          </button>
        </form>
      </section>
    </div>
  );
}

export default AdminSettings;
