import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cancelBooking,
  createBooking,
  getRecentBookings,
  getUserBookings
} from '../services/bookingService';

export function useUserBookings(userId) {
  return useQuery({
    queryKey: ['bookings', 'user', userId],
    queryFn: () => getUserBookings(userId),
    enabled: Boolean(userId)
  });
}

export function useRecentBookings() {
  return useQuery({
    queryKey: ['bookings', 'recent'],
    queryFn: getRecentBookings
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBooking,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['availability', variables.courtId, variables.date] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    }
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    }
  });
}
