import BookingTable from '../components/BookingTable';
import StatCard from '../components/StatCard';
import { useAuth } from '../contexts/AuthContext';
import { useUserBookings } from '../hooks/useBookings';
import { formatCurrencyFromVnd } from '../utils/formatters';
import { getApiErrorMessage } from '../utils/errors';

function UserDashboard() {
  const { user } = useAuth();
  const { data, isLoading, isError, error } = useUserBookings(user?.id, { page: 1, limit: 20 });

  const bookings = data?.items || [];
  const confirmed = bookings.filter((item) => item.status === 'CONFIRMED' || item.status === 'COMPLETED').length;
  const pending = bookings.filter((item) => item.status === 'PENDING' || item.status === 'LOCKED').length;
  const spentVnd = bookings.reduce((sum, item) => sum + item.amountVnd, 0);

  return (
    <div className='space-y-6'>
      <section className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        <StatCard label='Tổng lượt đặt của tôi' value={bookings.length} delta='Thống kê toàn bộ thời gian' />
        <StatCard label='Đã xác nhận' value={confirmed} tone='success' />
        <StatCard label='Đang chờ' value={pending} tone='warning' />
        <StatCard label='Tổng chi phí' value={formatCurrencyFromVnd(spentVnd)} tone='info' />
      </section>

      <section className='surface-card p-5'>
        <h2 className='section-title'>Lịch đặt sân gần đây</h2>
        <p className='subtle-copy mt-1'>Theo dõi các đơn đặt sân mới nhất và trạng thái xử lý.</p>

        <div className='mt-4'>
          {isLoading ? <p className='text-sm text-slate-500'>Đang tải lịch đặt sân...</p> : null}

          {isError ? (
            <div className='rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'>
              {getApiErrorMessage(error, 'Không tải được lịch đặt sân của bạn.')}
            </div>
          ) : null}

          {!isLoading && !isError ? (
            <BookingTable rows={bookings} showUser={false} emptyMessage='Bạn chưa có lịch đặt sân nào.' />
          ) : null}
        </div>
      </section>
    </div>
  );
}

export default UserDashboard;
