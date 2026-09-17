import { useQuery } from '@tanstack/react-query';
import { tripService } from '../services/tripService';

export const useFeaturedOffers = () => {
    return useQuery({
        queryKey: ['featured-trip-offers'],
        queryFn: () => tripService.searchOffers({}), // Fetch all active offers by default
        staleTime: 10 * 60 * 1000, // 10 minutes
        refetchOnWindowFocus: false,
    });
};
