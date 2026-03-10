import BookingTable from '../components/BookingTable';
import { useAuth } from '../contexts/AuthContext';
import { useUserBookings } from '../hooks/useBookings';
import { getApiErrorMessage } from '../utils/errors';

function BookingHistory() {
  const { user } = useAuth();
  const { data, isLoading, isError, error } = useUserBookings(user?.id, { page: 1, limit: 50 });

  const bookings = data?.items || [];

  return (
    <div className='surface-card p-5'>
      <h2 className='section-title'>Lịch sử đặt sân</h2>
      <p className='subtle-copy mt-1'>Toàn bộ lịch sử đặt sân của bạn.</p>

      <div className='mt-4'>
        {isLoading ? <p className='text-sm text-slate-500'>Đang tải lịch sử đặt sân...</p> : null}

        {isError ? (
          <div className='rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'>
            {getApiErrorMessage(error, 'Không tải được lịch sử đặt sân.')}
          </div>
        ) : null}

        {!isLoading && !isError ? (
          <BookingTable rows={bookings} showUser={false} emptyMessage='Bạn chưa có dữ liệu đặt sân.' />
        ) : null}
      </div>
    </div>
  );
}

export default BookingHistory;
