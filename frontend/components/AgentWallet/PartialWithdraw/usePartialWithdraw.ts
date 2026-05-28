import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { REACT_QUERY_KEYS } from '@/constants';
import { useServices } from '@/hooks';
import { ServicesService } from '@/service/Services';
import { WithdrawSafeRequestAmounts } from '@/types';

/**
 * Partial withdrawal of funds from the agent safe to the master safe
 * (no unstaking, no service termination). On success, invalidates the
 * withdrawable-balance query and the balance/refill queries so the UI
 * reflects the post-withdrawal state without a manual refresh.
 */
export const usePartialWithdraw = () => {
  const queryClient = useQueryClient();
  const { selectedService } = useServices();

  const { isPending, isSuccess, isError, error, mutateAsync, reset } =
    useMutation<void, unknown, WithdrawSafeRequestAmounts>({
      mutationFn: async (amounts) => {
        if (!selectedService?.service_config_id) {
          throw new Error('Service config ID not found');
        }

        await ServicesService.withdrawSafe({
          serviceConfigId: selectedService.service_config_id,
          amounts,
        });
      },
      onSuccess: () => {
        const serviceConfigId = selectedService?.service_config_id;
        if (serviceConfigId) {
          queryClient.invalidateQueries({
            queryKey:
              REACT_QUERY_KEYS.SAFE_WITHDRAWABLE_BALANCE_KEY(serviceConfigId),
          });
        }
        // Invalidate by prefix so both per-service and all-services
        // balance queries refetch (see BalancesAndRefillRequirementsProvider).
        queryClient.invalidateQueries({
          queryKey: ['balancesAndRefillRequirements'],
        });
        queryClient.invalidateQueries({
          queryKey: ['allChainBalancesAndRefillRequirements'],
        });
      },
    });

  const onPartialWithdraw = useCallback(
    async (amounts: WithdrawSafeRequestAmounts) => {
      try {
        await mutateAsync(amounts);
      } catch (caughtError) {
        console.error(caughtError);
      }
    },
    [mutateAsync],
  );

  return {
    isLoading: isPending,
    isSuccess,
    isError,
    error,
    onPartialWithdraw,
    resetMutation: reset,
  };
};
