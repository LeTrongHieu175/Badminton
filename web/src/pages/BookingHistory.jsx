import BookingTable from '../components/BookingTable';
import { useAuth } from '../contexts/AuthContext';
import { useCancelBooking, useUserBookings } from '../hooks/useBookings';
import { getApiErrorMessage } from '../utils/errors';

function BookingHistory() {
  const { user } = useAuth();
  const { data, isLoading, isError, error } = useUserBookings(user?.id, { page: 1, limit: 100 });
  const cancelMutation = useCancelBooking();

  const bookings = data?.items || [];
  const activeBookings = bookings.filter((item) => item.status === 'LOCKED' || item.status === 'CONFIRMED');
  const historyBookings = bookings.filter((item) => item.status === 'COMPLETED' || item.status === 'CANCELLED');

  return (
    <div className='space-y-4'>
      <section className='surface-card p-5'>
        <h2 className='section-title'>Sân đang đặt</h2>
        <p className='subtle-copy mt-1'>Các đơn đang khóa/đã xác nhận. Bạn có thể hủy nếu chưa hoàn thành.</p>

        <div className='mt-4'>
          {isLoading ? <p className='text-sm text-slate-500'>Đang tải đơn đang đặt...</p> : null}

          {isError ? (
            <div className='rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'>
              {getApiErrorMessage(error, 'Không tải được danh sách sân đang đặt.')}
            </div>
          ) : null}

          {cancelMutation.isError ? (
            <div className='mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'>
              {getApiErrorMessage(cancelMutation.error, 'Hủy đặt sân thất bại.')}
            </div>
          ) : null}

          {!isLoading && !isError ? (
            <BookingTable
              rows={activeBookings}
              showUser={false}
              emptyMessage='Bạn chưa có sân nào đang đặt.'
              renderActions={(row) => (
                <button
                  type='button'
                  onClick={() => cancelMutation.mutate(row.id)}
                  disabled={cancelMutation.isPending}
                  className='rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-60'
                >
                  Hủy đặt sân
                </button>
              )}
            />
          ) : null}
        </div>
      </section>

      <section className='surface-card p-5'>
        <h2 className='section-title'>Lịch sử đặt sân</h2>
        <p className='subtle-copy mt-1'>Lịch sử hoàn thành hoặc đã hủy của tài khoản.</p>

        <div className='mt-4'>
          {!isLoading && !isError ? (
            <BookingTable rows={historyBookings} showUser={false} emptyMessage='Chưa có dữ liệu lịch sử đặt sân.' />
          ) : null}
        </div>
      </section>
    </div>
  );
}

export default BookingHistory;
