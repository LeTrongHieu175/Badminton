import { Link } from 'react-router-dom';
import { formatStatusLabel } from '../utils/formatters';

function CourtCard({ court, recommended = false }) {
  const isActive = Boolean(court.isActive);

  return (
    <article
      className={`surface-card p-5 ${
        recommended ? 'border-2 border-amber-300 bg-amber-50/40' : ''
      }`}
    >
      <div className='flex items-start justify-between gap-3'>
        <div>
          <h3 className='text-lg font-semibold text-slate-900'>{court.name}</h3>
          <p className='mt-1 text-sm text-slate-500'>{court.location || 'Chưa cập nhật vị trí'}</p>
        </div>
        <div className='flex flex-col items-end gap-2'>
          {recommended ? (
            <span className='rounded-full bg-amber-200 px-2.5 py-1 text-xs font-semibold text-amber-800'>
              Gợi ý
            </span>
          ) : null}
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-700'
            }`}
          >
            {formatStatusLabel(isActive ? 'ACTIVE' : 'INACTIVE')}
          </span>
        </div>
      </div>

      <div className='mt-4 flex items-center justify-between'>
        <p className='text-sm text-slate-600'>Khung giá linh hoạt theo từng khung giờ</p>
        <Link
          to={`/courts/${court.id}/booking`}
          className={`rounded-lg px-3 py-2 text-sm font-medium text-white ${
            isActive ? 'bg-brand-600 hover:bg-brand-700' : 'pointer-events-none bg-slate-400'
          }`}
        >
          Đặt ngay
        </Link>
      </div>
    </article>
  );
}

export default CourtCard;
