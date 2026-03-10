import { useMemo, useState } from 'react';
import CourtCard from '../components/CourtCard';
import { useCourts, useCourtRecommendations } from '../hooks/useCourts';
import { getApiErrorMessage } from '../utils/errors';

function CourtList() {
  const [search, setSearch] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const {
    data: courts = [],
    isLoading: isCourtsLoading,
    isError: isCourtsError,
    error: courtsError
  } = useCourts();

  const {
    data: recommendation,
    isLoading: isRecommendationLoading,
    isError: isRecommendationError,
    error: recommendationError
  } = useCourtRecommendations(date);

  const recommendedCourtIds = useMemo(
    () => recommendation?.recommendedCourtIds || [],
    [recommendation]
  );

  const filteredCourts = useMemo(() => {
    const needle = search.toLowerCase().trim();
    const base = needle
      ? courts.filter(
          (court) =>
            court.name.toLowerCase().includes(needle) ||
            (court.location || '').toLowerCase().includes(needle)
        )
      : courts;

    return [...base].sort((a, b) => {
      const aRecommended = recommendedCourtIds.includes(a.id);
      const bRecommended = recommendedCourtIds.includes(b.id);

      if (aRecommended && !bRecommended) return -1;
      if (!aRecommended && bRecommended) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [courts, search, recommendedCourtIds]);

  return (
    <div className='space-y-6'>
      <div className='surface-card p-5'>
        <h2 className='section-title'>Đặt sân</h2>
        <p className='subtle-copy mt-1'>Chọn ngày thi đấu để xem sân còn trống và gợi ý ưu tiên từ AI.</p>

        <div className='mt-4 grid gap-3 md:grid-cols-[1fr_220px]'>
          <input
            type='text'
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder='Tìm theo tên sân hoặc vị trí'
            className='w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none ring-brand-300 focus:ring'
          />
          <input
            type='date'
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className='w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none ring-brand-300 focus:ring'
          />
        </div>

        {isRecommendationLoading ? (
          <p className='mt-3 text-xs text-slate-500'>Đang tải gợi ý AI...</p>
        ) : null}

        {!isRecommendationLoading && recommendation?.aiStatus === 'unavailable' ? (
          <p className='mt-3 text-xs text-amber-700'>AI tạm thời không phản hồi. Bạn vẫn có thể đặt sân bình thường.</p>
        ) : null}

        {isRecommendationError ? (
          <p className='mt-3 text-xs text-rose-700'>{getApiErrorMessage(recommendationError, 'Không tải được gợi ý AI.')}</p>
        ) : null}
      </div>

      {isCourtsLoading ? <p className='text-sm text-slate-500'>Đang tải danh sách sân...</p> : null}

      {isCourtsError ? (
        <div className='rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'>
          {getApiErrorMessage(courtsError, 'Không tải được danh sách sân.')}
        </div>
      ) : null}

      {!isCourtsLoading && !isCourtsError && filteredCourts.length === 0 ? (
        <div className='rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500'>
          Không có sân phù hợp với bộ lọc hiện tại.
        </div>
      ) : null}

      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
        {filteredCourts.map((court) => (
          <CourtCard key={court.id} court={court} recommended={recommendedCourtIds.includes(court.id)} />
        ))}
      </div>
    </div>
  );
}

export default CourtList;
