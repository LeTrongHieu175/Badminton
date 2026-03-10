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
  return useQuery({
    queryKey: ['court', courtId],
    queryFn: () => getCourtById(courtId),
    enabled: Boolean(courtId)
  });
}

export function useCourtAvailability(courtId, date) {
  return useQuery({
    queryKey: ['availability', courtId, date],
    queryFn: () => getCourtAvailability(courtId, date),
    enabled: Boolean(courtId && date)
  });
}

export function useCourtRecommendations(date) {
  return useQuery({
    queryKey: ['court-recommendations', date],
    queryFn: () => getCourtRecommendations(date),
    enabled: Boolean(date)
  });
}
