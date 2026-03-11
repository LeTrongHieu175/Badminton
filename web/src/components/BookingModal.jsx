import { formatCurrencyFromVnd } from '../utils/formatters';

function BookingModal({ open, court, slot, date, onClose, onConfirm, isSubmitting }) {
  if (!open || !court || !slot) {
    return null;
  }

  return (
    <div className='fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4'>
      <div className='w-full max-w-md rounded-2xl bg-white p-6 shadow-panel'>
        <h3 className='text-lg font-semibold text-slate-900'>Xác nhận đặt sân</h3>
        <p className='mt-2 text-sm text-slate-600'>
          {court.name} · {date} · {slot.label}
        </p>
        <p className='mt-1 text-sm text-slate-600'>
          {slot.startTime} - {slot.endTime} · {formatCurrencyFromVnd(slot.priceVnd)}
        </p>

        <div className='mt-6 flex justify-end gap-2'>
          <button
            type='button'
            onClick={onClose}
            className='rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700'
          >
            Hủy
          </button>
          <button
            type='button'
            onClick={onConfirm}
            disabled={isSubmitting}
            className='rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70'
          >
            {isSubmitting ? 'Đang đặt...' : 'Xác nhận'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BookingModal;
