import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import CourtCard from '../components/CourtCard';
import { useCourts, useCourtRecommendations } from '../hooks/useCourts';
import { getApiErrorMessage } from '../utils/errors';
import { formatCurrencyFromVnd } from '../utils/formatters';

function matchesSearch(name, location, needle) {
  if (!needle) {
    return true;
  }

  return name.toLowerCase().includes(needle) || String(location || '').toLowerCase().includes(needle);
}

function getStrategyCopy(strategy) {
  if (strategy === 'personalized') {
    return 'Đề xuất được cá nhân hóa theo lịch sử đặt sân và khung giờ bạn hay chơi.';
  }

  if (strategy === 'cold_start') {
    return 'Bạn chưa có nhiều lịch sử đặt sân, nên hệ thống ưu tiên các khung giờ dễ chơi và dễ đặt.';
  }

  if (strategy === 'fallback') {
    return 'AI tạm thời không phản hồi, hệ thống đang dùng chiến lược gợi ý dự phòng để bạn vẫn đặt nhanh được.';
  }

  return 'Chọn ngày thi đấu để xem các khung giờ gợi ý trước khi duyệt toàn bộ sân còn trống.';
}

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

  const needle = search.toLowerCase().trim();

  const recommendedOptions = useMemo(() => {
    const options = recommendation?.recommendedOptions || [];
    return options.filter((option) => matchesSearch(option.courtName, option.location, needle));
  }, [needle, recommendation]);

  const recommendedCourtIds = useMemo(() => {
    return [...new Set(recommendedOptions.map((option) => option.courtId))];
  }, [recommendedOptions]);

  const visibleCourts = useMemo(() => {
    return courts
      .filter((court) => matchesSearch(court.name, court.location, needle))
      .sort((a, b) => {
        const aRecommended = recommendedCourtIds.includes(a.id);
        const bRecommended = recommendedCourtIds.includes(b.id);

        if (aRecommended && !bRecommended) {
          return -1;
        }

        if (!aRecommended && bRecommended) {
          return 1;
        }

        return a.name.localeCompare(b.name);
      });
  }, [courts, needle, recommendedCourtIds]);

  return (
    <div className='space-y-6'>
      <section className='surface-card p-5'>
        <h2 className='section-title'>Đặt sân</h2>
        <p className='subtle-copy mt-1'>Chọn ngày thi đấu để xem gợi ý AI theo sân và khung giờ trước khi đặt.</p>

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
      </section>

      <section className='surface-card p-5'>
        <div className='flex flex-col gap-2 md:flex-row md:items-start md:justify-between'>
          <div>
            <h3 className='text-lg font-semibold text-slate-900'>AI gợi ý cho bạn</h3>
            <p className='mt-1 text-sm text-slate-600'>{getStrategyCopy(recommendation?.strategy)}</p>
          </div>
          {recommendation?.strategy && recommendation.strategy !== 'empty' ? (
            <span className='rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-brand-700'>
              {recommendation.strategy === 'personalized'
                ? 'Cá nhân hóa'
                : recommendation.strategy === 'cold_start'
                  ? 'Mặc định thông minh'
                  : 'Dự phòng'}
            </span>
          ) : null}
        </div>

        {isRecommendationLoading ? (
          <p className='mt-4 text-sm text-slate-500'>Đang phân tích sân và khung giờ phù hợp...</p>
        ) : null}

        {!isRecommendationLoading && recommendation?.aiStatus === 'unavailable' ? (
          <div className='mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800'>
            AI service đang chậm phản hồi. Các gợi ý bên dưới đang dùng chiến lược dự phòng.
          </div>
        ) : null}

        {isRecommendationError ? (
          <div className='mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'>
            {getApiErrorMessage(recommendationError, 'Không tải được gợi ý AI.')}
          </div>
        ) : null}

        {!isRecommendationLoading && !isRecommendationError && recommendedOptions.length === 0 ? (
          <div className='mt-4 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500'>
            Chưa có gợi ý phù hợp cho bộ lọc hiện tại. Bạn vẫn có thể chọn trực tiếp từ danh sách sân bên dưới.
          </div>
        ) : null}

        <div className='mt-4 grid gap-4 lg:grid-cols-3'>
          {recommendedOptions.map((option, index) => (
            <article key={option.slotId} className='rounded-2xl border border-brand-200 bg-brand-50/60 p-5 shadow-sm'>
              <div className='flex items-start justify-between gap-3'>
                <div>
                  <p className='text-xs font-semibold uppercase tracking-[0.18em] text-brand-700'>Gợi ý {index + 1}</p>
                  <h4 className='mt-2 text-lg font-semibold text-slate-900'>{option.courtName}</h4>
                  <p className='mt-1 text-sm text-slate-500'>{option.location || 'Chưa cập nhật vị trí'}</p>
                </div>
                <span className='rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-brand-700'>
                  Điểm {option.score.toFixed(2)}
                </span>
              </div>

              <div className='mt-4 rounded-xl bg-white/80 px-4 py-3'>
                <p className='text-sm font-semibold text-slate-900'>{option.startTime} - {option.endTime}</p>
                <p className='mt-1 text-sm text-slate-600'>{formatCurrencyFromVnd(option.priceVnd)}</p>
              </div>

              <p className='mt-4 text-sm leading-6 text-slate-700'>{option.reason}</p>

              <Link
                to={`/courts/${option.courtId}/booking?date=${encodeURIComponent(date)}&slotId=${option.slotId}`}
                className='mt-4 inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700'
              >
                Đặt khung giờ này
              </Link>
            </article>
          ))}
        </div>
      </section>

      {isCourtsLoading ? <p className='text-sm text-slate-500'>Đang tải danh sách sân...</p> : null}

      {isCourtsError ? (
        <div className='rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'>
          {getApiErrorMessage(courtsError, 'Không tải được danh sách sân.')}
        </div>
      ) : null}

      {!isCourtsLoading && !isCourtsError ? (
        <section className='space-y-4'>
          <div className='surface-card p-5'>
            <h3 className='text-lg font-semibold text-slate-900'>Tất cả sân</h3>
            <p className='mt-1 text-sm text-slate-600'>
              Khối này luôn hiển thị đầy đủ sân để bạn có thể vào đúng sân mong muốn và chọn khung giờ khác.
            </p>
          </div>

          {visibleCourts.length === 0 ? (
            <div className='rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500'>
              Không có sân phù hợp với bộ lọc hiện tại.
            </div>
          ) : (
            <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
              {visibleCourts.map((court) => (
                <CourtCard
                  key={court.id}
                  court={court}
                  recommended={recommendedCourtIds.includes(court.id)}
                  date={date}
                />
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}

export default CourtList;
