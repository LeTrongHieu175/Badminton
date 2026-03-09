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

function heatColor(demand) {
  if (demand > 70) return '#0f766e';
  if (demand > 50) return '#0d9488';
  if (demand > 35) return '#14b8a6';
  if (demand > 25) return '#5eead4';
  return '#99f6e4';
}

function AdminDashboard() {
  const { data, isLoading } = useAdminDashboard();

  if (isLoading || !data) {
    return <p className='text-sm text-slate-500'>Loading dashboard data...</p>;
  }

  const { stats, revenue, utilization, peakHours, recentBookings } = data;

  return (
    <div className='space-y-6'>
      <section className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        <StatCard label='Revenue (YTD)' value={`$${stats.totalRevenue.toLocaleString()}`} delta='+12% vs last quarter' tone='info' />
        <StatCard label='Bookings' value={stats.totalBookings.toLocaleString()} delta='Including locked and confirmed' />
        <StatCard label='Active Users' value={stats.activeUsers.toLocaleString()} delta='Monthly active users' tone='success' />
        <StatCard
          label='Avg Utilization'
          value={`${Number(stats.avgUtilization).toFixed(1)}%`}
          delta='Across all courts'
          tone='warning'
        />
      </section>

      <section className='grid gap-4 xl:grid-cols-2'>
        <ChartCard title='Revenue Over Time' subtitle='Monthly revenue trend'>
          <ResponsiveContainer width='100%' height='100%'>
            <LineChart data={revenue}>
              <CartesianGrid strokeDasharray='3 3' stroke='#e2e8f0' />
              <XAxis dataKey='period' tick={{ fontSize: 12 }} stroke='#94a3b8' />
              <YAxis tick={{ fontSize: 12 }} stroke='#94a3b8' />
              <Tooltip />
              <Line type='monotone' dataKey='revenue' stroke='#0d9488' strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title='Court Utilization Rate' subtitle='Usage percentage by court'>
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart data={utilization}>
              <CartesianGrid strokeDasharray='3 3' stroke='#e2e8f0' />
              <XAxis dataKey='court' tick={{ fontSize: 12 }} stroke='#94a3b8' />
              <YAxis tick={{ fontSize: 12 }} stroke='#94a3b8' />
              <Tooltip />
              <Bar dataKey='usage' radius={[8, 8, 0, 0]} fill='#14b8a6' />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <section>
        <ChartCard title='Peak Hour Heatmap' subtitle='Demand intensity by hour of day'>
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart data={peakHours}>
              <CartesianGrid strokeDasharray='3 3' stroke='#e2e8f0' />
              <XAxis dataKey='hour' tick={{ fontSize: 11 }} stroke='#94a3b8' />
              <YAxis tick={{ fontSize: 12 }} stroke='#94a3b8' />
              <Tooltip />
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
        <h2 className='text-base font-semibold text-slate-900'>Recent Bookings</h2>
        <p className='mt-1 text-xs text-slate-500'>Latest customer activity and booking states.</p>
        <div className='mt-4'>
          <BookingTable rows={recentBookings} />
        </div>
      </section>
    </div>
  );
}

export default AdminDashboard;
