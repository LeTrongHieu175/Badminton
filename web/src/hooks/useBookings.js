import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cancelBooking,
  completeBooking,
  createBooking,
  getAllBookings,
  getUserBookings
} from '../services/bookingService';
import { createPaymentIntent } from '../services/paymentService';

export function useUserBookings(userId, options = {}) {
  const {
    page = 1,
    limit = 20,
    refetchInterval = false,
    refetchIntervalInBackground = false
  } = options;

  return useQuery({
    queryKey: ['bookings', 'user', userId, page, limit],
    queryFn: () => getUserBookings(userId, { page, limit }),
    enabled: Boolean(userId),
    refetchInterval,
    refetchIntervalInBackground
  });
}

export function useAdminBookings(filters = {}) {
  return useQuery({
    queryKey: ['bookings', 'admin', filters],
    queryFn: () => getAllBookings(filters)
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBooking,
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['availability', variables.courtId, variables.date], (currentSlots = []) => {
        if (!Array.isArray(currentSlots)) {
          return currentSlots;
        }

        return currentSlots.map((slot) =>
          slot.id === variables.slotId
            ? {
                ...slot,
                status: 'LOCKED',
                bookingId: data.id,
                lockExpiresAt: data.lockExpiresAt ?? slot.lockExpiresAt ?? null
              }
            : slot
        );
      });

      queryClient.invalidateQueries({ queryKey: ['availability', variables.courtId, variables.date] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['court-recommendations', variables.date] });
    }
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
    }
  });
}

export function useCompleteBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: completeBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
    }
  });
}

export function useCreatePaymentIntent() {
  return useMutation({
    mutationFn: createPaymentIntent
  });
}
