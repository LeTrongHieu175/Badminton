import { useQuery } from '@tanstack/react-query';
import { getAdminOverview } from '../services/analyticsService';

export function useAdminDashboard() {
  return useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: getAdminOverview
  });
}
