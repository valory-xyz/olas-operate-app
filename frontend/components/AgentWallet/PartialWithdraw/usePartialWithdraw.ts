import { useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useServices } from '@/hooks';
import { ServicesService } from '@/service/Services';
import { WithdrawSafeRequestAmounts } from '@/types';

/**
 * Hook to handle partial withdrawal of funds from the agent safe
 * to the master safe (no unstaking).
 */
export const usePartialWithdraw = () => {
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
