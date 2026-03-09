import BookingTable from '../components/BookingTable';
import { useAuth } from '../contexts/AuthContext';
import { useUserBookings } from '../hooks/useBookings';

function BookingHistory() {
  const { user } = useAuth();
  const { data: bookings = [], isLoading } = useUserBookings(user.id);

  return (
    <div className='surface-card p-5'>
      <h2 className='section-title'>Booking History</h2>
      <p className='subtle-copy mt-1'>Complete history of your bookings for expense and activity tracking.</p>

      <div className='mt-4'>
        {isLoading ? <p className='text-sm text-slate-500'>Loading history...</p> : <BookingTable rows={bookings} />}
      </div>
    </div>
  );
}

export default BookingHistory;
