import { useQuery } from '@tanstack/react-query';
import { tripService } from '../services/tripService';

export const useBookings = (userId) => {
    return useQuery({
        queryKey: ['trip_bookings', userId],
        queryFn: () => tripService.getPilgrimBookings(userId),
        enabled: !!userId,
    });
};
