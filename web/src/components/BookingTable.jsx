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

function BookingTable({ rows }) {
  return (
    <div className='overflow-hidden rounded-xl border border-slate-200'>
      <div className='overflow-x-auto'>
        <table className='min-w-full divide-y divide-slate-200 text-sm'>
          <thead className='bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500'>
            <tr>
              <th className='px-4 py-3'>Date</th>
              <th className='px-4 py-3'>Court</th>
              <th className='px-4 py-3'>Slot</th>
              <th className='px-4 py-3'>User</th>
              <th className='px-4 py-3'>Status</th>
              <th className='px-4 py-3'>Amount</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-slate-100 bg-white'>
            {rows.map((row) => (
              <tr key={row.id} className='hover:bg-slate-50'>
                <td className='whitespace-nowrap px-4 py-3 text-slate-700'>{row.bookingDate}</td>
                <td className='whitespace-nowrap px-4 py-3 font-medium text-slate-900'>{row.courtName}</td>
                <td className='whitespace-nowrap px-4 py-3 text-slate-700'>{row.slotLabel}</td>
                <td className='whitespace-nowrap px-4 py-3 text-slate-700'>{row.userName}</td>
                <td className='whitespace-nowrap px-4 py-3'>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${formatStatusBadge(row.status)}`}>
                    {row.status}
                  </span>
                </td>
                <td className='whitespace-nowrap px-4 py-3 text-slate-700'>${row.amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default BookingTable;
