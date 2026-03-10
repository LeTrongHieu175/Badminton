import { formatCurrencyFromCents, formatDateVi, formatStatusLabel } from '../utils/formatters';

function formatStatusBadge(status) {
  const map = {
    CONFIRMED: 'bg-emerald-50 text-emerald-700',
    COMPLETED: 'bg-cyan-50 text-cyan-700',
    PENDING: 'bg-amber-50 text-amber-700',
    CANCELLED: 'bg-rose-50 text-rose-700',
    LOCKED: 'bg-amber-50 text-amber-700'
  };
  return map[status] || 'bg-slate-100 text-slate-700';
}

function BookingTable({
  rows,
  showUser = true,
  emptyMessage = 'Chưa có dữ liệu đặt sân.',
  renderActions = null
}) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return (
      <div className='rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500'>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className='overflow-hidden rounded-xl border border-slate-200'>
      <div className='overflow-x-auto'>
        <table className='min-w-full divide-y divide-slate-200 text-sm'>
          <thead className='bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500'>
            <tr>
              <th className='px-4 py-3'>Ngày</th>
              <th className='px-4 py-3'>Sân</th>
              <th className='px-4 py-3'>Khung giờ</th>
              {showUser ? <th className='px-4 py-3'>Người đặt</th> : null}
              <th className='px-4 py-3'>Trạng thái</th>
              <th className='px-4 py-3'>Số tiền</th>
              {renderActions ? <th className='px-4 py-3'>Thao tác</th> : null}
            </tr>
          </thead>
          <tbody className='divide-y divide-slate-100 bg-white'>
            {rows.map((row) => (
              <tr key={row.id} className='hover:bg-slate-50'>
                <td className='whitespace-nowrap px-4 py-3 text-slate-700'>{formatDateVi(row.bookingDate)}</td>
                <td className='whitespace-nowrap px-4 py-3 font-medium text-slate-900'>{row.courtName}</td>
                <td className='whitespace-nowrap px-4 py-3 text-slate-700'>{row.slotLabel}</td>
                {showUser ? <td className='whitespace-nowrap px-4 py-3 text-slate-700'>{row.userName || '-'}</td> : null}
                <td className='whitespace-nowrap px-4 py-3'>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${formatStatusBadge(row.status)}`}>
                    {formatStatusLabel(row.status)}
                  </span>
                </td>
                <td className='whitespace-nowrap px-4 py-3 text-slate-700'>{formatCurrencyFromCents(row.amountCents)}</td>
                {renderActions ? <td className='whitespace-nowrap px-4 py-3 text-slate-700'>{renderActions(row)}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default BookingTable;
