import { useMutation } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { useElectronApi, useMasterWalletContext, useServices } from '@/hooks';
import { ServicesService } from '@/service/Services';

/**
 * Hook to handle withdrawal of funds from the agent wallet
 * to the master safe.
 */
export const useWithdrawFunds = () => {
  const electronApi = useElectronApi();
  const { selectedAgentConfig, selectedService, selectedAgentType } =
    useServices();
  const { masterSafes } = useMasterWalletContext();

  const evmHomeChainId = selectedAgentConfig?.evmHomeChainId;
  const masterSafeAddress = useMemo(() => {
    const safe = masterSafes?.find(
      ({ evmChainId }) => evmChainId === evmHomeChainId,
    );
    return safe?.address;
  }, [masterSafes, evmHomeChainId]);

  const { isPending, isSuccess, isError, mutateAsync } = useMutation({
    mutationFn: async () => {
      if (!masterSafeAddress) {
        throw new Error('Master Safe address not found');
      }

      if (!selectedService?.service_config_id) {
        throw new Error('Service config ID not found');
      }

      await ServicesService.withdrawBalance({
        withdrawAddress: masterSafeAddress,
        serviceConfigId: selectedService.service_config_id,
      });
    },
    onSuccess: () => {
      // Update the store to indicate that the agent is no longer initially funded
      electronApi.store?.set?.(`${selectedAgentType}.isInitialFunded`, false);
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
