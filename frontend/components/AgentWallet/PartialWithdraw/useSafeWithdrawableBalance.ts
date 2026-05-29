import { useQuery } from '@tanstack/react-query';

import { REACT_QUERY_KEYS } from '@/constants';
import { useServices } from '@/hooks';
import { ServicesService } from '@/service/Services';

/**
 * Fetches the withdrawable balance for the selected service's safe.
 * Exposes `refetch` so consumers can wire a "Retry" CTA after a failed fetch.
 */
export const useSafeWithdrawableBalance = () => {
  const { selectedService } = useServices();
  const serviceConfigId = selectedService?.service_config_id;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: REACT_QUERY_KEYS.SAFE_WITHDRAWABLE_BALANCE_KEY(
      serviceConfigId ?? '',
    ),
    queryFn: () =>
      ServicesService.getSafeWithdrawableBalance({
        serviceConfigId: serviceConfigId!,
      }),
    enabled: !!serviceConfigId,
  });

  return { data, isLoading, isError, refetch };
};
