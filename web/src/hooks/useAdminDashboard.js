import { useQuery } from '@tanstack/react-query';
import {
  getDashboardSummary,
  getPeakHoursSeries,
  getRevenueSeries,
  getUtilizationByCourt
} from '../services/analyticsService';
import { getAllBookings } from '../services/bookingService';

export function useAdminDashboard() {
  return useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const [stats, revenue, utilization, peakHours, recentBookingPayload] = await Promise.all([
        getDashboardSummary(),
        getRevenueSeries(),
        getUtilizationByCourt(),
        getPeakHoursSeries(),
        getAllBookings({ page: 1, limit: 10 })
      ]);

      return {
        stats,
        revenue,
        utilization,
        peakHours,
        recentBookings: recentBookingPayload.items
      };
    }
  });
}
