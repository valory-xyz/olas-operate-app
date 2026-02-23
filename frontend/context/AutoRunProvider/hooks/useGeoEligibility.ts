import { useQuery } from '@tanstack/react-query';

import { fetchGeoEligibility } from '../utils';

export const useGeoEligibility = (isOnline: boolean) => {
  return useQuery({
    queryKey: ['geoEligibility', 'autorun'],
    queryFn: ({ signal }) => fetchGeoEligibility(signal),
    enabled: isOnline,
    staleTime: 1000 * 60 * 60,
  });
};
