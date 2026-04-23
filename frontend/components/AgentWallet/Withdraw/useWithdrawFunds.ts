import { useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useServices } from '@/hooks';
import { ServicesService } from '@/service/Services';

/**
 * Hook to handle withdrawal of funds from the agent wallet
 * to the master safe.
 */
export const useWithdrawFunds = () => {
  const { selectedService } = useServices();

  const { isPending, isSuccess, isError, error, mutateAsync } = useMutation<
    void,
    unknown,
    void
  >({
    mutationFn: async () => {
      if (!selectedService?.service_config_id) {
        throw new Error('Service config ID not found');
      }

      await ServicesService.withdrawBalance({
        serviceConfigId: selectedService.service_config_id,
      });
    },
  });

  const onWithdrawFunds = useCallback(async () => {
    try {
      await mutateAsync();
    } catch (caughtError) {
      console.error(caughtError);
    }
  }, [mutateAsync]);

  return {
    isLoading: isPending,
    isSuccess,
    isError,
    error,
    onWithdrawFunds,
  };
};
