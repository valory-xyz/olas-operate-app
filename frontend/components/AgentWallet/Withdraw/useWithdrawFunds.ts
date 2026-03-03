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

  const { isPending, isSuccess, isError, mutateAsync } = useMutation({
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
    } catch (error) {
      console.error(error);
    }
  }, [mutateAsync]);

  return {
    isLoading: isPending,
    isSuccess,
    isError,
    onWithdrawFunds,
  };
};
