import { useEffect, useState } from 'react';
import BookingTable from '../components/BookingTable';
import PaymentModal from '../components/PaymentModal';
import { useAuth } from '../contexts/AuthContext';
import { useCancelBooking, useCreatePaymentIntent, useUserBookings } from '../hooks/useBookings';
import { getApiErrorMessage } from '../utils/errors';

const REFUND_CUTOFF_HOURS = 5;

function canRefundBooking(booking) {
  if (!booking?.bookingDate || !booking?.startTime) {
    return false;
  }

  const bookingDate = String(booking.bookingDate).slice(0, 10);
  const slotStart = new Date(`${bookingDate}T${booking.startTime}:00`);
  if (Number.isNaN(slotStart.getTime())) {
    return false;
  }

  const diffMs = slotStart.getTime() - Date.now();
  return diffMs >= REFUND_CUTOFF_HOURS * 60 * 60 * 1000;
}

function BookingHistory() {
  const { user } = useAuth();
  const [paymentInfo, setPaymentInfo] = useState(null);
  const { data, isLoading, isError, error, refetch } = useUserBookings(user?.id, {
    page: 1,
    limit: 100
  });
  const cancelMutation = useCancelBooking();
  const paymentIntentMutation = useCreatePaymentIntent();

  const bookings = data?.items || [];
  const activeBookings = bookings.filter((item) => item.status === 'LOCKED' || item.status === 'CONFIRMED');
  const historyBookings = bookings.filter(
    (item) => item.status === 'COMPLETED' || item.status === 'CANCELLED' || item.status === 'REFUNDED'
  );

  const mutationError = cancelMutation.error || paymentIntentMutation.error;
  const activePaymentBookingId = paymentInfo?.bookingId || null;

  useEffect(() => {
    if (!activePaymentBookingId) {
      return undefined;
    }

    let cancelled = false;
    const intervalRef = setInterval(async () => {
      const latest = await refetch();
      if (cancelled) {
        return;
      }

      const latestItems = latest.data?.items || [];
      const targetBooking = latestItems.find((item) => item.id === activePaymentBookingId);
      if (targetBooking && targetBooking.status !== 'LOCKED') {
        setPaymentInfo(null);
      }
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(intervalRef);
    };
  }, [activePaymentBookingId, refetch]);

  return (
    <div className='space-y-4'>
      <section className='surface-card p-5'>
        <h2 className='section-title'>Sân đang đặt</h2>
        <p className='subtle-copy mt-1'>
          Đơn Đã khóa cần thanh toán trong 10 phút. Đơn Đã xác nhận chỉ có thể hoàn tiền khi còn ít nhất 5 tiếng trước giờ chơi.
        </p>

        <div className='mt-4'>
          {isLoading ? <p className='text-sm text-slate-500'>Đang tải đơn đang đặt...</p> : null}

          {isError ? (
            <div className='rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'>
              {getApiErrorMessage(error, 'Không tải được danh sách sân đang đặt.')}
            </div>
          ) : null}

          {mutationError ? (
            <div className='mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'>
              {getApiErrorMessage(mutationError, 'Thao tác thất bại.')}
            </div>
          ) : null}

          {!isLoading && !isError ? (
            <BookingTable
              rows={activeBookings}
              showUser={false}
              emptyMessage='Bạn chưa có sân nào đang đặt.'
              renderActions={(row) => {
                if (row.status === 'LOCKED') {
                  return (
                    <div className='flex gap-2'>
                      <button
                        type='button'
                        onClick={async () => {
                          const paymentPayload = await paymentIntentMutation.mutateAsync({ bookingId: row.id });
                          setPaymentInfo(paymentPayload);
                        }}
                        disabled={paymentIntentMutation.isPending || cancelMutation.isPending}
                        className='rounded-lg border border-cyan-200 px-3 py-1 text-xs font-semibold text-cyan-700 disabled:cursor-not-allowed disabled:opacity-60'
                      >
                        Thanh toán
                      </button>
                      <button
                        type='button'
                        onClick={() => cancelMutation.mutate(row.id)}
                        disabled={paymentIntentMutation.isPending || cancelMutation.isPending}
                        className='rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-60'
                      >
                        Hủy đặt sân
                      </button>
                    </div>
                  );
                }

                if (row.status === 'CONFIRMED') {
                  const refundable = canRefundBooking(row);
                  return (
                    <button
                      type='button'
                      onClick={() => cancelMutation.mutate(row.id)}
                      disabled={!refundable || cancelMutation.isPending || paymentIntentMutation.isPending}
                      className='rounded-lg border border-violet-200 px-3 py-1 text-xs font-semibold text-violet-700 disabled:cursor-not-allowed disabled:opacity-50'
                    >
                      Hoàn tiền
                    </button>
                  );
                }

                return null;
              }}
            />
          ) : null}
        </div>
      </section>

      <section className='surface-card p-5'>
        <h2 className='section-title'>Lịch sử đặt sân</h2>
        <p className='subtle-copy mt-1'>Lịch sử hoàn thành, đã hủy hoặc đã hoàn tiền.</p>

        <div className='mt-4'>
          {!isLoading && !isError ? (
            <BookingTable rows={historyBookings} showUser={false} emptyMessage='Chưa có dữ liệu lịch sử đặt sân.' />
          ) : null}
        </div>
      </section>

      <PaymentModal
        open={Boolean(paymentInfo)}
        paymentInfo={paymentInfo}
        onClose={() => setPaymentInfo(null)}
      />
    </div>
  );
}

export default BookingHistory;
