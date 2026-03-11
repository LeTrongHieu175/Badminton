import { useMemo, useState } from 'react';
import BookingTable from '../../components/BookingTable';
import { useAdminBookings, useCancelBooking, useCompleteBooking } from '../../hooks/useBookings';
import { getApiErrorMessage } from '../../utils/errors';

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'LOCKED', label: 'Đã khóa' },
  { value: 'CONFIRMED', label: 'Đã xác nhận' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
  { value: 'CANCELLED', label: 'Đã hủy' },
  { value: 'REFUNDED', label: 'Hoàn tiền' }
];

const REFUND_CUTOFF_HOURS = 5;

function canRefundBooking(booking) {
  if (!booking?.bookingDate || !booking?.startTime) {
    return false;
  }

  const slotStart = new Date(`${booking.bookingDate}T${booking.startTime}:00`);
  if (Number.isNaN(slotStart.getTime())) {
    return false;
  }

  const diffMs = slotStart.getTime() - Date.now();
  return diffMs >= REFUND_CUTOFF_HOURS * 60 * 60 * 1000;
}

function AdminBookings() {
  const [filters, setFilters] = useState({
    userId: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    page: 1,
    limit: 20
  });

  const queryFilters = useMemo(
    () => ({
      userId: filters.userId ? Number(filters.userId) : undefined,
      status: filters.status || undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      page: filters.page,
      limit: filters.limit
    }),
    [filters]
  );

  const { data, isLoading, isError, error } = useAdminBookings(queryFilters);
  const completeMutation = useCompleteBooking();
  const cancelMutation = useCancelBooking();

  const bookings = data?.items || [];
  const activeBookings = bookings.filter((item) => item.status === 'LOCKED' || item.status === 'CONFIRMED');
  const historyBookings = bookings.filter(
    (item) => item.status === 'COMPLETED' || item.status === 'CANCELLED' || item.status === 'REFUNDED'
  );
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0, limit: 20 };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1
    }));
  };

  const goToPage = (nextPage) => {
    setFilters((prev) => ({
      ...prev,
      page: nextPage
    }));
  };

  const mutationError = completeMutation.error || cancelMutation.error;

  return (
    <div className='space-y-4'>
      <section className='surface-card p-5'>
        <h2 className='text-xl font-semibold text-slate-900'>Đơn đặt sân toàn hệ thống</h2>
        <p className='mt-1 text-sm text-slate-600'>Lọc theo người dùng, trạng thái và khoảng ngày.</p>

        <div className='mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-5'>
          <input
            type='number'
            min='1'
            value={filters.userId}
            onChange={(event) => handleFilterChange('userId', event.target.value)}
            placeholder='User ID'
            className='rounded-xl border border-slate-200 px-3 py-2 text-sm'
          />

          <select
            value={filters.status}
            onChange={(event) => handleFilterChange('status', event.target.value)}
            className='rounded-xl border border-slate-200 px-3 py-2 text-sm'
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <input
            type='date'
            value={filters.dateFrom}
            onChange={(event) => handleFilterChange('dateFrom', event.target.value)}
            className='rounded-xl border border-slate-200 px-3 py-2 text-sm'
          />

          <input
            type='date'
            value={filters.dateTo}
            onChange={(event) => handleFilterChange('dateTo', event.target.value)}
            className='rounded-xl border border-slate-200 px-3 py-2 text-sm'
          />

          <select
            value={filters.limit}
            onChange={(event) => handleFilterChange('limit', Number(event.target.value))}
            className='rounded-xl border border-slate-200 px-3 py-2 text-sm'
          >
            <option value={10}>10 dòng</option>
            <option value={20}>20 dòng</option>
            <option value={50}>50 dòng</option>
          </select>
        </div>
      </section>

      {isLoading ? <p className='text-sm text-slate-500'>Đang tải danh sách đặt sân...</p> : null}

      {isError ? (
        <div className='rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'>
          {getApiErrorMessage(error, 'Không tải được danh sách đặt sân.')}
        </div>
      ) : null}

      {mutationError ? (
        <div className='rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'>
          {getApiErrorMessage(mutationError, 'Cập nhật trạng thái đơn thất bại.')}
        </div>
      ) : null}

      {!isLoading && !isError ? (
        <section className='surface-card p-5'>
          <h3 className='text-base font-semibold text-slate-900'>Đơn đang đặt</h3>
          <p className='mt-1 text-xs text-slate-500'>Đơn ở trạng thái Đã khóa/Đã xác nhận.</p>

          <div className='mt-3'>
            <BookingTable
              rows={activeBookings}
              emptyMessage='Không có đơn đang đặt phù hợp bộ lọc.'
              renderActions={(row) => {
                if (row.status === 'LOCKED') {
                  return (
                    <div className='flex gap-2'>
                      <button
                        type='button'
                        onClick={() => completeMutation.mutate(row.id)}
                        disabled={completeMutation.isPending || cancelMutation.isPending}
                        className='rounded-lg border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60'
                      >
                        Hoàn thành
                      </button>
                      <button
                        type='button'
                        onClick={() => cancelMutation.mutate(row.id)}
                        disabled={completeMutation.isPending || cancelMutation.isPending}
                        className='rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-60'
                      >
                        Hủy
                      </button>
                    </div>
                  );
                }

                if (row.status === 'CONFIRMED') {
                  return (
                    <div className='flex gap-2'>
                      <button
                        type='button'
                        onClick={() => completeMutation.mutate(row.id)}
                        disabled={completeMutation.isPending || cancelMutation.isPending}
                        className='rounded-lg border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60'
                      >
                        Hoàn thành
                      </button>
                      <button
                        type='button'
                        onClick={() => cancelMutation.mutate(row.id)}
                        disabled={!canRefundBooking(row) || completeMutation.isPending || cancelMutation.isPending}
                        className='rounded-lg border border-violet-200 px-3 py-1 text-xs font-semibold text-violet-700 disabled:cursor-not-allowed disabled:opacity-60'
                      >
                        Hoàn tiền
                      </button>
                    </div>
                  );
                }

                return null;
              }}
            />
          </div>

          <h3 className='mt-6 text-base font-semibold text-slate-900'>Lịch sử đơn</h3>
          <p className='mt-1 text-xs text-slate-500'>Đơn đã hoàn thành hoặc đã hủy.</p>

          <div className='mt-3'>
            <BookingTable rows={historyBookings} emptyMessage='Chưa có lịch sử đơn theo bộ lọc.' />
          </div>

          <div className='mt-4 flex items-center justify-between text-sm text-slate-600'>
            <p>
              Tổng: <span className='font-semibold'>{pagination.total}</span> đơn
            </p>

            <div className='flex items-center gap-2'>
              <button
                type='button'
                onClick={() => goToPage(Math.max(1, pagination.page - 1))}
                disabled={pagination.page <= 1}
                className='rounded-lg border border-slate-200 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-60'
              >
                Trước
              </button>
              <span>
                Trang {pagination.page} / {Math.max(pagination.totalPages, 1)}
              </span>
              <button
                type='button'
                onClick={() => goToPage(Math.min(Math.max(pagination.totalPages, 1), pagination.page + 1))}
                disabled={pagination.page >= Math.max(pagination.totalPages, 1)}
                className='rounded-lg border border-slate-200 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-60'
              >
                Sau
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default AdminBookings;
