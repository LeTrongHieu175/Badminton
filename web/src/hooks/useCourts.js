import { useQuery } from '@tanstack/react-query';
import { getCourtAvailability, getCourtById, getCourts } from '../services/courtService';

export function useCourts() {
  return useQuery({
    queryKey: ['courts'],
    queryFn: getCourts
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
