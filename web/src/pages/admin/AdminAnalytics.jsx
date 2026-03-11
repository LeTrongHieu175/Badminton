import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import ChartCard from '../../components/ChartCard';
import { useAdminDashboard } from '../../hooks/useAdminDashboard';
import { formatCurrencyFromVnd } from '../../utils/formatters';
import { getApiErrorMessage } from '../../utils/errors';

function AdminAnalytics() {
  const { data, isLoading, isError, error } = useAdminDashboard();

  if (isLoading) {
    return <p className='text-sm text-slate-500'>Đang tải dữ liệu phân tích...</p>;
  }

  if (isError || !data) {
    return (
      <div className='rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'>
        {getApiErrorMessage(error, 'Không tải được dữ liệu phân tích.')}
      </div>
    );
  }

  const mergedSeries = data.revenue.map((point, index) => ({
    period: point.period,
    revenueVnd: point.revenueVnd,
    utilization: data.utilization[index % Math.max(data.utilization.length, 1)]?.usage || 0
  }));

  return (
    <div className='space-y-4'>
      <ChartCard title='Xu hướng doanh thu và công suất' subtitle='So sánh theo chu kỳ vận hành'>
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
    </div>
  );
}

export default AdminAnalytics;
