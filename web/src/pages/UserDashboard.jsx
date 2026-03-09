import BookingTable from '../components/BookingTable';
import StatCard from '../components/StatCard';
import { useAuth } from '../contexts/AuthContext';
import { useUserBookings } from '../hooks/useBookings';

function UserDashboard() {
  const { user } = useAuth();
  const { data: bookings = [], isLoading } = useUserBookings(user.id);

  const confirmed = bookings.filter((item) => item.status === 'CONFIRMED' || item.status === 'COMPLETED').length;
  const pending = bookings.filter((item) => item.status === 'PENDING' || item.status === 'LOCKED').length;
  const spent = bookings.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className='space-y-6'>
      <section className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        <StatCard label='My Bookings' value={bookings.length} delta='All time records' />
        <StatCard label='Confirmed' value={confirmed} tone='success' />
        <StatCard label='Pending' value={pending} tone='warning' />
        <StatCard label='Total Spend' value={`$${spent.toFixed(2)}`} tone='info' />
      </section>

      <section className='surface-card p-5'>
        <h2 className='section-title'>Upcoming & Recent Bookings</h2>
        <p className='subtle-copy mt-1'>Track your latest court reservations and payment state.</p>

        <div className='mt-4'>
          {isLoading ? <p className='text-sm text-slate-500'>Loading bookings...</p> : <BookingTable rows={bookings} />}
        </div>
      </section>
    </div>
  );
}

export default UserDashboard;
