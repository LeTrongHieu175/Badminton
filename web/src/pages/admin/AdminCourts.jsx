import CourtCard from '../../components/CourtCard';
import { useCourts } from '../../hooks/useCourts';

function AdminCourts() {
  const { data: courts = [], isLoading } = useCourts();

  return (
    <div className='space-y-4'>
      <section className='surface-card p-5'>
        <h2 className='text-xl font-semibold text-slate-900'>Court Management</h2>
        <p className='mt-1 text-sm text-slate-600'>Monitor active status and price settings for every court.</p>
      </section>

      {isLoading ? <p className='text-sm text-slate-500'>Loading courts...</p> : null}

      <section className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
        {courts.map((court) => (
          <CourtCard key={court.id} court={court} />
        ))}
      </section>
    </div>
  );
}

export default AdminCourts;
