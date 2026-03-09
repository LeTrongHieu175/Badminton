function StatCard({ label, value, delta, tone = 'default' }) {
  const toneClasses = {
    default: 'text-slate-900',
    success: 'text-emerald-700',
    warning: 'text-amber-700',
    info: 'text-cyan-700'
  };

  return (
    <div className='surface-card p-5'>
      <p className='text-sm font-medium text-slate-500'>{label}</p>
      <p className={`mt-3 text-3xl font-semibold ${toneClasses[tone] || toneClasses.default}`}>{value}</p>
      {delta ? <p className='mt-2 text-xs text-slate-500'>{delta}</p> : null}
    </div>
  );
}

export default StatCard;
