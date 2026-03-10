import { useMemo } from 'react';
import { useAdminDashboard } from '../../hooks/useAdminDashboard';
import { getApiErrorMessage } from '../../utils/errors';

function AdminAIInsights() {
  const { data, isLoading, isError, error } = useAdminDashboard();

  const insights = useMemo(() => {
    if (!data) {
      return [];
    }

    const topHour = [...data.peakHours].sort((a, b) => b.demand - a.demand)[0];
    const weakestCourt = [...data.utilization].sort((a, b) => a.usage - b.usage)[0];
    const strongestCourt = [...data.utilization].sort((a, b) => b.usage - a.usage)[0];

    return [
      {
        title: 'Chiến lược giờ cao điểm',
        content: topHour
          ? `${topHour.hour} là khung giờ có nhu cầu cao nhất. Nên cân nhắc chính sách giá linh hoạt hoặc thêm nhân sự vận hành.`
          : 'Chưa đủ dữ liệu để xác định giờ cao điểm.'
      },
      {
        title: 'Sân cần kích cầu',
        content: weakestCourt
          ? `${weakestCourt.court} đang có tỷ lệ sử dụng thấp nhất. Nên chạy ưu đãi theo khung giờ thấp điểm.`
          : 'Chưa đủ dữ liệu để xác định sân cần kích cầu.'
      },
      {
        title: 'Tín hiệu mở rộng',
        content: strongestCourt
          ? `${strongestCourt.court} có công suất cao ổn định. Có thể mở thêm slot hoặc tăng ưu tiên hiển thị.`
          : 'Chưa đủ dữ liệu để xác định tín hiệu mở rộng.'
      }
    ];
  }, [data]);

  if (isLoading) {
    return <p className='text-sm text-slate-500'>Đang tạo gợi ý AI...</p>;
  }

  if (isError || !data) {
    return (
      <div className='rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'>
        {getApiErrorMessage(error, 'Không tải được dữ liệu gợi ý AI.')}
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      <section className='surface-card p-5'>
        <h2 className='text-xl font-semibold text-slate-900'>Gợi ý vận hành từ dữ liệu</h2>
        <p className='mt-1 text-sm text-slate-600'>
          Các khuyến nghị được tổng hợp từ dữ liệu đặt sân và công suất sử dụng thực tế.
        </p>
      </section>

      <section className='grid gap-4 md:grid-cols-3'>
        {insights.map((insight) => (
          <article key={insight.title} className='surface-card p-5'>
            <h3 className='text-base font-semibold text-slate-900'>{insight.title}</h3>
            <p className='mt-2 text-sm text-slate-600'>{insight.content}</p>
          </article>
        ))}
      </section>
    </div>
  );
}

export default AdminAIInsights;
