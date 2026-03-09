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

function AdminAnalytics() {
  const { data, isLoading } = useAdminDashboard();

  if (isLoading || !data) {
    return <p className='text-sm text-slate-500'>Loading analytics...</p>;
  }

  const mergedSeries = data.revenue.map((point, index) => ({
    period: point.period,
    revenue: point.revenue,
    utilization: data.utilization[index % data.utilization.length]?.usage || 0
  }));

  return (
    <div className='space-y-4'>
      <ChartCard title='Revenue and Utilization Trend' subtitle='Cross-metric comparison for planning and staffing'>
        <ResponsiveContainer width='100%' height='100%'>
          <LineChart data={mergedSeries}>
            <CartesianGrid strokeDasharray='3 3' stroke='#e2e8f0' />
            <XAxis dataKey='period' tick={{ fontSize: 12 }} stroke='#94a3b8' />
            <YAxis yAxisId='left' tick={{ fontSize: 12 }} stroke='#94a3b8' />
            <YAxis yAxisId='right' orientation='right' tick={{ fontSize: 12 }} stroke='#94a3b8' />
            <Tooltip />
            <Legend />
            <Line yAxisId='left' type='monotone' dataKey='revenue' stroke='#0d9488' strokeWidth={3} dot={false} />
            <Line yAxisId='right' type='monotone' dataKey='utilization' stroke='#0284c7' strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

export default AdminAnalytics;
