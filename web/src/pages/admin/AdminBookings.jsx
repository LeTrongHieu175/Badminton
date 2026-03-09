import BookingTable from '../../components/BookingTable';
import { useRecentBookings } from '../../hooks/useBookings';

function AdminBookings() {
  const { data: bookings = [], isLoading } = useRecentBookings();

  return (
    <div className='surface-card p-5'>
      <h2 className='text-xl font-semibold text-slate-900'>Booking Operations</h2>
      <p className='mt-1 text-sm text-slate-600'>Track current reservation states and customer activity.</p>

      <div className='mt-4'>
        {isLoading ? <p className='text-sm text-slate-500'>Loading bookings...</p> : <BookingTable rows={bookings} />}
      </div>
    </div>
  );
}

export default AdminBookings;
