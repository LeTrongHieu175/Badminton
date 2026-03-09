import { useQuery } from '@tanstack/react-query';
import {
  getDashboardStats,
  getPeakHoursSeries,
  getRecentBookings,
  getRevenueSeries,
  getUtilizationSeries
} from '../services/analyticsService';

export function useAdminDashboard() {
  return useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const [stats, revenue, utilization, peakHours, recentBookings] = await Promise.all([
        getDashboardStats(),
        getRevenueSeries(),
        getUtilizationSeries(),
        getPeakHoursSeries(),
        getRecentBookings()
      ]);

      return {
        stats,
        revenue,
        utilization,
        peakHours,
        recentBookings
      };
    }
  });
}
