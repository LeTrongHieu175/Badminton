import { useQuery } from '@tanstack/react-query';
import {
  getCourtAvailability,
  getCourtById,
  getCourts,
  getCourtRecommendations
} from '../services/courtService';

export function useCourts(options = {}) {
  return useQuery({
    queryKey: ['courts', options.includeInactive ? 'all' : 'active'],
    queryFn: () => getCourts(options)
  });
}

export function useCourt(courtId) {
  const normalizedCourtId = Number(courtId);

  return useQuery({
    queryKey: ['court', normalizedCourtId],
    queryFn: () => getCourtById(normalizedCourtId),
    enabled: Number.isFinite(normalizedCourtId) && normalizedCourtId > 0
  });
}

export function useCourtAvailability(courtId, date) {
  const normalizedCourtId = Number(courtId);

  return useQuery({
    queryKey: ['availability', normalizedCourtId, date],
    queryFn: () => getCourtAvailability(normalizedCourtId, date),
    enabled: Number.isFinite(normalizedCourtId) && normalizedCourtId > 0 && Boolean(date)
  });
}

export function useCourtRecommendations(date) {
  return useQuery({
    queryKey: ['court-recommendations', date],
    queryFn: () => getCourtRecommendations(date),
    enabled: Boolean(date)
  });
}
