import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import BookingTable from '../../components/BookingTable';
import ChartCard from '../../components/ChartCard';
import StatCard from '../../components/StatCard';
import { useAdminDashboard } from '../../hooks/useAdminDashboard';
import { formatCurrencyFromVnd, formatNumberVi } from '../../utils/formatters';
import { getApiErrorMessage } from '../../utils/errors';

function heatColor(demand) {
  if (demand > 70) return '#0f766e';
  if (demand > 50) return '#0d9488';
  if (demand > 35) return '#14b8a6';
  if (demand > 25) return '#5eead4';
  return '#99f6e4';
}

function getSeverityClasses(severity) {
  if (severity === 'high') {
    return 'border-rose-200 bg-rose-50 text-rose-700';
  }

  if (severity === 'medium') {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  return 'border-sky-200 bg-sky-50 text-sky-700';
}

function getPriorityBadge(priority) {
  if (priority === 'high') {
    return 'bg-rose-100 text-rose-700';
  }

  if (priority === 'low') {
    return 'bg-sky-100 text-sky-700';
  }

  return 'bg-amber-100 text-amber-700';
}

function AdminDashboard() {
  const { data, isLoading, isError, error } = useAdminDashboard();

  if (isLoading) {
    return <p className='text-sm text-slate-500'>Đang tải dữ liệu bảng điều khiển...</p>;
  }

  if (isError || !data) {
    return (
      <div className='rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'>
        {getApiErrorMessage(error, 'Không tải được dữ liệu dashboard quản trị.')}
      </div>
    );
  }

  const { stats, charts, alerts, aiInsights, recentBookings } = data;
  const utilizationByPeriod = new Map((charts.utilizationSeries || []).map((point) => [point.period, point]));
  const mergedSeries = charts.revenue.map((point) => ({
    period: point.period,
    revenueVnd: point.revenueVnd,
    utilization: utilizationByPeriod.get(point.period)?.usage || 0
  }));
  const monthRevenueSeries = charts.revenueByMonth || [];

  return (
    <div className='space-y-6'>
      <section className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        <StatCard label='Doanh thu hôm nay' value={formatCurrencyFromVnd(stats.revenueTodayVnd)} tone='info' />
        <StatCard label='Doanh thu tháng này' value={formatCurrencyFromVnd(stats.revenueMonthToDateVnd)} tone='info' />
        <StatCard label='Doanh thu năm nay' value={formatCurrencyFromVnd(stats.revenueYearToDateVnd)} tone='info' />
        <StatCard
          label='Tổng doanh thu toàn kỳ'
          value={formatCurrencyFromVnd(stats.revenueAllTimeVnd)}
          delta='Toàn bộ dữ liệu hiện có trong hệ thống'
          tone='info'
        />
      </section>

      <section className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        <StatCard label='Tổng lượt đặt sân' value={formatNumberVi(stats.totalBookings)} />
        <StatCard label='Người dùng hoạt động' value={formatNumberVi(stats.activeUsers)} tone='success' />
        <StatCard
          label='Công suất trung bình 30 ngày'
          value={`${Number(stats.avgUtilizationLast30DaysPercent || 0).toFixed(1)}%`}
          delta='Phản ánh nhịp vận hành ngắn hạn'
          tone='warning'
        />
        <StatCard
          label='Công suất trung bình toàn kỳ'
          value={`${Number(stats.avgUtilizationPercent || 0).toFixed(1)}%`}
          tone='warning'
        />
      </section>

      <section className='grid gap-4 xl:grid-cols-2'>
        <ChartCard title='Doanh thu 30 ngày gần nhất' subtitle='Theo ngày để thấy biến động ngắn hạn'>
          <ResponsiveContainer width='100%' height='100%'>
            <LineChart data={charts.revenue}>
              <CartesianGrid strokeDasharray='3 3' stroke='#e2e8f0' />
              <XAxis dataKey='period' tick={{ fontSize: 12 }} stroke='#94a3b8' />
              <YAxis tick={{ fontSize: 12 }} stroke='#94a3b8' />
              <Tooltip formatter={(value) => formatCurrencyFromVnd(value)} labelFormatter={(label) => `Ngày: ${label}`} />
              <Line type='monotone' dataKey='revenueVnd' stroke='#0d9488' strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title='Doanh thu 12 tháng gần nhất' subtitle='Theo tháng để đọc xu hướng dài hạn'>
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart data={monthRevenueSeries}>
              <CartesianGrid strokeDasharray='3 3' stroke='#e2e8f0' />
              <XAxis dataKey='period' tick={{ fontSize: 12 }} stroke='#94a3b8' />
              <YAxis tick={{ fontSize: 12 }} stroke='#94a3b8' />
              <Tooltip formatter={(value) => formatCurrencyFromVnd(value)} labelFormatter={(label) => `Tháng: ${label}`} />
              <Bar dataKey='revenueVnd' radius={[8, 8, 0, 0]} fill='#0d9488' />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <section className='grid gap-4 xl:grid-cols-2'>
        <ChartCard title='Công suất 30 ngày gần nhất' subtitle='Theo ngày để đối chiếu với doanh thu ngắn hạn'>
          <ResponsiveContainer width='100%' height='100%'>
            <LineChart data={charts.utilizationSeries}>
              <CartesianGrid strokeDasharray='3 3' stroke='#e2e8f0' />
              <XAxis dataKey='period' tick={{ fontSize: 12 }} stroke='#94a3b8' />
              <YAxis tick={{ fontSize: 12 }} stroke='#94a3b8' domain={[0, 100]} />
              <Tooltip formatter={(value) => `${value}%`} labelFormatter={(label) => `Ngày: ${label}`} />
              <Line type='monotone' dataKey='usage' stroke='#0284c7' strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title='Tỷ lệ sử dụng theo sân' subtitle='So sánh hiệu suất giữa các sân'>
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart data={charts.utilization}>
              <CartesianGrid strokeDasharray='3 3' stroke='#e2e8f0' />
              <XAxis dataKey='court' tick={{ fontSize: 12 }} stroke='#94a3b8' />
              <YAxis tick={{ fontSize: 12 }} stroke='#94a3b8' />
              <Tooltip formatter={(value) => `${value}%`} />
              <Bar dataKey='usage' radius={[8, 8, 0, 0]} fill='#14b8a6' />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <section>
        <ChartCard title='Nhu cầu theo khung giờ' subtitle='Phát hiện giờ cao điểm theo dữ liệu đặt sân'>
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart data={charts.peakHours}>
              <CartesianGrid strokeDasharray='3 3' stroke='#e2e8f0' />
              <XAxis dataKey='hour' tick={{ fontSize: 11 }} stroke='#94a3b8' />
              <YAxis tick={{ fontSize: 12 }} stroke='#94a3b8' />
              <Tooltip formatter={(value) => `${value} lượt`} />
              <Bar dataKey='demand' radius={[6, 6, 0, 0]}>
                {charts.peakHours.map((entry) => (
                  <Cell key={entry.hour} fill={heatColor(entry.demand)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <section className='grid gap-4 xl:grid-cols-[1.1fr_0.9fr]'>
        <ChartCard title='Tương quan doanh thu và công suất 30 ngày' subtitle='Hai đường cùng theo ngày để đối chiếu dễ hơn'>
          <ResponsiveContainer width='100%' height='100%'>
            <LineChart data={mergedSeries}>
              <CartesianGrid strokeDasharray='3 3' stroke='#e2e8f0' />
              <XAxis dataKey='period' tick={{ fontSize: 12 }} stroke='#94a3b8' />
              <YAxis yAxisId='left' tick={{ fontSize: 12 }} stroke='#94a3b8' />
              <YAxis yAxisId='right' orientation='right' tick={{ fontSize: 12 }} stroke='#94a3b8' />
              <Tooltip
                formatter={(value, key) => {
                  if (key === 'revenueVnd') {
                    return formatCurrencyFromVnd(value);
                  }
                  return `${value}%`;
                }}
              />
              <Legend formatter={(value) => (value === 'revenueVnd' ? 'Doanh thu' : 'Công suất (%)')} />
              <Line yAxisId='left' type='monotone' dataKey='revenueVnd' stroke='#0d9488' strokeWidth={3} dot={false} />
              <Line yAxisId='right' type='monotone' dataKey='utilization' stroke='#0284c7' strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <section className='surface-card p-5'>
          <div className='flex items-start justify-between gap-4'>
            <div>
              <h2 className='text-base font-semibold text-slate-900'>Tóm tắt AI</h2>
              <p className='mt-1 text-xs text-slate-500'>
                {aiInsights.status === 'ok'
                  ? 'Được sinh từ AI workflow ở backend.'
                  : 'AI hiện không sẵn sàng, đang dùng khuyến nghị fallback.'}
              </p>
            </div>
            <span className='rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600'>
              {aiInsights.status === 'ok' ? 'AI hoạt động' : 'Fallback'}
            </span>
          </div>

          <p className='mt-4 text-sm leading-6 text-slate-600'>{aiInsights.summary}</p>

          <div className='mt-5 space-y-3'>
            {aiInsights.recommendations.map((item) => (
              <article key={`${item.title}-${item.action}`} className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                <div className='flex items-center justify-between gap-3'>
                  <h3 className='text-sm font-semibold text-slate-900'>{item.title}</h3>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase ${getPriorityBadge(item.priority)}`}>
                    {item.priority}
                  </span>
                </div>
                <p className='mt-2 text-sm text-slate-600'>{item.reason}</p>
                <p className='mt-2 text-sm font-medium text-slate-800'>{item.action}</p>
              </article>
            ))}
          </div>
        </section>
      </section>

      <section className='surface-card p-5'>
        <h2 className='text-base font-semibold text-slate-900'>Cảnh báo vận hành</h2>
        <p className='mt-1 text-xs text-slate-500'>Các tín hiệu cần xử lý hoặc theo dõi trong chu kỳ hiện tại.</p>
        <div className='mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
          {alerts.map((alert) => (
            <article key={`${alert.type}-${alert.title}`} className={`rounded-2xl border p-4 ${getSeverityClasses(alert.severity)}`}>
              <p className='text-xs font-semibold uppercase tracking-[0.18em]'>{alert.severity}</p>
              <h3 className='mt-2 text-sm font-semibold'>{alert.title}</h3>
              <p className='mt-2 text-sm'>{alert.message}</p>
            </article>
          ))}
        </div>
      </section>

      <section className='surface-card p-5'>
        <h2 className='text-base font-semibold text-slate-900'>Đơn đặt sân gần đây</h2>
        <p className='mt-1 text-xs text-slate-500'>Danh sách cập nhật từ toàn bộ hệ thống.</p>
        <div className='mt-4'>
          <BookingTable rows={recentBookings} emptyMessage='Chưa có dữ liệu đặt sân.' />
        </div>
      </section>
    </div>
  );
}

export default AdminDashboard;
