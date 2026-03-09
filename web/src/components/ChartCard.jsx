function ChartCard({ title, subtitle, children }) {
  return (
    <section className='surface-card p-5'>
      <div className='mb-4'>
        <h3 className='text-base font-semibold text-slate-900'>{title}</h3>
        {subtitle ? <p className='mt-1 text-xs text-slate-500'>{subtitle}</p> : null}
      </div>
      <div className='h-72'>{children}</div>
    </section>
  );
}

export default ChartCard;
