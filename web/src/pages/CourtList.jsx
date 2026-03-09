import { useMemo, useState } from 'react';
import CourtCard from '../components/CourtCard';
import { useCourts } from '../hooks/useCourts';

function CourtList() {
  const [search, setSearch] = useState('');
  const { data: courts = [], isLoading } = useCourts();

  const filteredCourts = useMemo(() => {
    const needle = search.toLowerCase().trim();
    if (!needle) {
      return courts;
    }

    return courts.filter(
      (court) =>
        court.name.toLowerCase().includes(needle) ||
        court.location.toLowerCase().includes(needle) ||
        court.status.toLowerCase().includes(needle)
    );
  }, [courts, search]);

  return (
    <div className='space-y-6'>
      <div className='surface-card p-5'>
        <h2 className='section-title'>Court List</h2>
        <p className='subtle-copy mt-1'>Find available badminton courts and start booking instantly.</p>
        <input
          type='text'
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder='Search by name, location, or status'
          className='mt-4 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none ring-brand-300 focus:ring'
        />
      </div>

      {isLoading ? <p className='text-sm text-slate-500'>Loading courts...</p> : null}

      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
        {filteredCourts.map((court) => (
          <CourtCard key={court.id} court={court} />
        ))}
      </div>
    </div>
  );
}

export default CourtList;
