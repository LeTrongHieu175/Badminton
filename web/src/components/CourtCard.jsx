import { Link } from 'react-router-dom';

function CourtCard({ court }) {
  const isActive = court.status === 'ACTIVE';

  return (
    <article className='surface-card p-5'>
      <div className='flex items-start justify-between gap-3'>
        <div>
          <h3 className='text-lg font-semibold text-slate-900'>{court.name}</h3>
          <p className='mt-1 text-sm text-slate-500'>{court.location}</p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
          }`}
        >
          {court.status}
        </span>
      </div>

      <div className='mt-4 flex items-center justify-between'>
        <p className='text-sm text-slate-600'>
          <span className='text-xl font-semibold text-slate-900'>${court.pricePerHour.toFixed(2)}</span> / hour
        </p>
        <Link
          to={`/courts/${court.id}/booking`}
          className='rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700'
        >
          Book now
        </Link>
      </div>
    </article>
  );
}

export default CourtCard;
