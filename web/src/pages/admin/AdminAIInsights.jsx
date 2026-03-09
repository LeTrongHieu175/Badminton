import { useMemo } from 'react';
import { useAdminDashboard } from '../../hooks/useAdminDashboard';

function AdminAIInsights() {
  const { data, isLoading } = useAdminDashboard();

  const insights = useMemo(() => {
    if (!data) {
      return [];
    }

    const topHour = [...data.peakHours].sort((a, b) => b.demand - a.demand)[0];
    const weakestCourt = [...data.utilization].sort((a, b) => a.usage - b.usage)[0];
    const strongestCourt = [...data.utilization].sort((a, b) => b.usage - a.usage)[0];

    return [
      {
        title: 'Peak hour strategy',
        content: `${topHour.hour} is the strongest demand window. Consider dynamic pricing or reservation limits.`
      },
      {
        title: 'Utilization gap',
        content: `${weakestCourt.court} is underused. Promote bundle discounts during off-peak hours.`
      },
      {
        title: 'Expansion signal',
        content: `${strongestCourt.court} has consistently high usage. Evaluate adding adjacent slot inventory.`
      }
    ];
  }, [data]);

  if (isLoading || !data) {
    return <p className='text-sm text-slate-500'>Generating insights...</p>;
  }

  return (
    <div className='space-y-4'>
      <section className='surface-card p-5'>
        <h2 className='text-xl font-semibold text-slate-900'>AI Insights</h2>
        <p className='mt-1 text-sm text-slate-600'>Operational recommendations generated from booking and utilization trends.</p>
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
