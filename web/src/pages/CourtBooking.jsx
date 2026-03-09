import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import BookingModal from '../components/BookingModal';
import { useCreateBooking } from '../hooks/useBookings';
import { useCourt, useCourtAvailability } from '../hooks/useCourts';

function CourtBooking() {
  const { id } = useParams();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedSlot, setSelectedSlot] = useState(null);

  const { data: court } = useCourt(id);
  const { data: slots = [], isLoading } = useCourtAvailability(id, date);
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

  const handleConfirmBooking = async () => {
    if (!selectedSlot) {
      return;
    }

    await createBookingMutation.mutateAsync({
      courtId: Number(id),
      slotId: selectedSlot.id,
      date
    });

    setSelectedSlot(null);
  };

  return (
    <div className='space-y-6'>
      <section className='surface-card p-6'>
        <h2 className='section-title'>Court Booking</h2>
        <p className='subtle-copy mt-1'>
          {court ? `${court.name} · ${court.location}` : 'Pick your slot and lock it for payment.'}
        </p>

        <div className='mt-4 flex flex-wrap items-center gap-3'>
          <label className='text-sm font-medium text-slate-600'>Booking date</label>
          <input
            type='date'
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className='rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-brand-300 focus:ring'
          />
          <p className='text-xs text-slate-500'>
            Available slots: {availabilityStats.available} / {availabilityStats.total}
          </p>
        </div>
      </section>

      {isLoading ? <p className='text-sm text-slate-500'>Loading slots...</p> : null}

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
            <p className='text-sm font-semibold text-slate-900'>{slot.label}</p>
            <p className='mt-1 text-xs text-slate-500'>${slot.price.toFixed(2)}</p>
            <span
              className={`mt-3 inline-block rounded-full px-2 py-1 text-xs font-semibold ${
                slot.status === 'AVAILABLE'
                  ? 'bg-emerald-100 text-emerald-700'
                  : slot.status === 'LOCKED'
                    ? 'bg-amber-100 text-amber-700'
                    : slot.status === 'CONFIRMED'
                      ? 'bg-cyan-100 text-cyan-700'
                      : 'bg-slate-200 text-slate-700'
              }`}
            >
              {slot.status}
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
    </div>
  );
}

export default CourtBooking;
