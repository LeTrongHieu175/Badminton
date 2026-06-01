import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import BookingModal from '../components/BookingModal';
import { useSystemSettings } from '../contexts/SystemSettingsContext';
import { useCreateBooking } from '../hooks/useBookings';
import { useCourt, useCourtAvailability } from '../hooks/useCourts';
import { formatCurrencyFromVnd, formatStatusLabel } from '../utils/formatters';
import { getApiErrorMessage } from '../utils/errors';

function CourtBooking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preferredSlotId = Number(searchParams.get('slotId') || 0);
  const [date, setDate] = useState(() => searchParams.get('date') || new Date().toISOString().slice(0, 10));
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [paymentNotice, setPaymentNotice] = useState(null);
  const { settings } = useSystemSettings();

  const { data: court, isError: isCourtError, error: courtError } = useCourt(id);
  const {
    data: slots = [],
    isLoading,
    isError: isSlotsError,
    error: slotsError
  } = useCourtAvailability(id, date);
  const createBookingMutation = useCreateBooking();

  const availabilityStats = useMemo(() => {
    return slots.reduce(
      (acc, slot) => {
        acc.total += 1;
        if (slot.status === 'AVAILABLE') {
          acc.available += 1;
        }
        return acc;
      },
      { total: 0, available: 0 }
    );
  }, [slots]);

  useEffect(() => {
    if (!preferredSlotId || !slots.length) {
      return;
    }

    const matchedSlot = slots.find((slot) => slot.id === preferredSlotId && slot.status === 'AVAILABLE');
    if (matchedSlot) {
      setSelectedSlot((current) => (current?.id === matchedSlot.id ? current : matchedSlot));
    }
  }, [preferredSlotId, slots]);

  const handleConfirmBooking = async () => {
    if (!selectedSlot) {
      return;
    }

    const booking = await createBookingMutation.mutateAsync({
      courtId: Number(id),
      slotId: selectedSlot.id,
      date
    });

    setPaymentNotice({
      bookingId: booking.id,
      holdMinutes: settings.bookingHoldMinutes
    });
    setSelectedSlot(null);
  };

  return (
    <div className='space-y-6'>
      <section className='surface-card p-6'>
        <h2 className='section-title'>Đặt sân</h2>
        <p className='subtle-copy mt-1'>
          {court ? `${court.name} · ${court.location || 'Chưa cập nhật vị trí'}` : 'Chọn khung giờ để đặt sân.'}
        </p>

        <div className='mt-4 flex flex-wrap items-center gap-3'>
          <label className='text-sm font-medium text-slate-600'>Ngày đặt sân</label>
          <input
            type='date'
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className='rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-brand-300 focus:ring'
          />
          <p className='text-xs text-slate-500'>
            Slot còn trống: {availabilityStats.available} / {availabilityStats.total}
          </p>
        </div>
      </section>

      {isCourtError ? (
        <div className='rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'>
          {getApiErrorMessage(courtError, 'Không tải được thông tin sân.')}
        </div>
      ) : null}

      {isLoading ? <p className='text-sm text-slate-500'>Đang tải khung giờ...</p> : null}

      {isSlotsError ? (
        <div className='rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'>
          {getApiErrorMessage(slotsError, 'Không tải được khung giờ của sân.')}
        </div>
      ) : null}

      {createBookingMutation.isError ? (
        <div className='rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'>
          {getApiErrorMessage(createBookingMutation.error, 'Đặt sân thất bại. Vui lòng thử lại.')}
        </div>
      ) : null}

      {!isLoading && !isSlotsError && slots.length === 0 ? (
        <div className='rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500'>
          Chưa có slot nào được cấu hình cho sân này.
        </div>
      ) : null}

      <section className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
        {slots.map((slot) => (
          <button
            key={slot.id}
            type='button'
            onClick={() => (slot.status === 'AVAILABLE' ? setSelectedSlot(slot) : null)}
            className={`rounded-xl border p-4 text-left transition ${
              slot.status === 'AVAILABLE'
                ? 'border-brand-200 bg-brand-50/60 hover:border-brand-400'
                : 'cursor-not-allowed border-slate-200 bg-slate-100'
            }`}
          >
            <p className='text-sm font-semibold text-slate-900'>
              {slot.startTime} - {slot.endTime}
            </p>
            <p className='mt-1 text-xs text-slate-500'>{formatCurrencyFromVnd(slot.priceVnd)}</p>
            <span
              className={`mt-3 inline-block rounded-full px-2 py-1 text-xs font-semibold ${
                slot.status === 'AVAILABLE'
                  ? 'bg-emerald-100 text-emerald-700'
                  : slot.status === 'LOCKED'
                    ? 'bg-amber-100 text-amber-700'
                    : slot.status === 'CONFIRMED'
                      ? 'bg-cyan-100 text-cyan-700'
                      : slot.status === 'REFUNDED'
                        ? 'bg-violet-100 text-violet-700'
                      : 'bg-slate-200 text-slate-700'
              }`}
            >
              {formatStatusLabel(slot.status)}
            </span>
          </button>
        ))}
      </section>

      <BookingModal
        open={Boolean(selectedSlot)}
        court={court}
        slot={selectedSlot}
        date={date}
        onClose={() => setSelectedSlot(null)}
        onConfirm={handleConfirmBooking}
        isSubmitting={createBookingMutation.isPending}
      />

      {paymentNotice ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4'>
          <div className='w-full max-w-lg rounded-3xl bg-white p-6 text-center shadow-panel'>
            <div className='mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-2xl text-amber-700'>
              !
            </div>
            <h3 className='mt-4 text-xl font-semibold text-slate-900'>Đặt sân thành công</h3>
            <p className='mt-3 text-sm leading-6 text-slate-600'>
              Bạn cần thanh toán trong vòng <span className='font-semibold text-amber-700'>{paymentNotice.holdMinutes} phút</span>{' '}
              kể từ lúc đặt sân để giữ chỗ. Quá thời gian này, đơn đặt sân sẽ tự động bị hủy.
            </p>

            <div className='mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center'>
              <button
                type='button'
                onClick={() => navigate('/bookings')}
                className='rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700'
              >
                Đi đến thanh toán
              </button>
              <button
                type='button'
                onClick={() => setPaymentNotice(null)}
                className='rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700'
              >
                Đóng thông báo
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default CourtBooking;
