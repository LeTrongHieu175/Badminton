import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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

  const { stats, revenue, utilization, peakHours, recentBookings } = data;

  return (
    <div className='space-y-6'>
      <section className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        <StatCard label='Tổng doanh thu' value={formatCurrencyFromVnd(stats.totalRevenueVnd)} tone='info' />
        <StatCard label='Tổng lượt đặt sân' value={formatNumberVi(stats.totalBookings)} />
        <StatCard label='Người dùng hoạt động' value={formatNumberVi(stats.activeUsers)} tone='success' />
        <StatCard
          label='Tỷ lệ sử dụng trung bình'
          value={`${Number(stats.avgUtilizationPercent || 0).toFixed(1)}%`}
          tone='warning'
        />
      </section>

      <section className='grid gap-4 xl:grid-cols-2'>
        <ChartCard title='Doanh thu theo ngày' subtitle='Dữ liệu thực từ hệ thống'>
          <ResponsiveContainer width='100%' height='100%'>
            <LineChart data={revenue}>
              <CartesianGrid strokeDasharray='3 3' stroke='#e2e8f0' />
              <XAxis dataKey='period' tick={{ fontSize: 12 }} stroke='#94a3b8' />
              <YAxis tick={{ fontSize: 12 }} stroke='#94a3b8' />
              <Tooltip formatter={(value) => formatCurrencyFromVnd(value)} labelFormatter={(label) => `Ngày: ${label}`} />
              <Line type='monotone' dataKey='revenueVnd' stroke='#0d9488' strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title='Tỷ lệ sử dụng theo sân' subtitle='So sánh hiệu suất từng sân'>
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart data={utilization}>
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
            <BarChart data={peakHours}>
              <CartesianGrid strokeDasharray='3 3' stroke='#e2e8f0' />
              <XAxis dataKey='hour' tick={{ fontSize: 11 }} stroke='#94a3b8' />
              <YAxis tick={{ fontSize: 12 }} stroke='#94a3b8' />
              <Tooltip formatter={(value) => `${value} lượt`} />
              <Bar dataKey='demand' radius={[6, 6, 0, 0]}>
                {peakHours.map((entry) => (
                  <Cell key={entry.hour} fill={heatColor(entry.demand)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
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
