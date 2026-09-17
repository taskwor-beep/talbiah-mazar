import { useQuery } from '@tanstack/react-query';
import { tripService } from '../services/tripService';

export const useSearchOffers = (params) => {
    return useQuery({
        queryKey: ['search-trip-offers', params],
        queryFn: () => tripService.searchOffers(params),
        enabled: !!params, // No fetch if params is null
        staleTime: 5 * 60 * 1000, 
        gcTime: 10 * 60 * 1000, 
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        placeholderData: (previousData) => previousData, 
    });
};
