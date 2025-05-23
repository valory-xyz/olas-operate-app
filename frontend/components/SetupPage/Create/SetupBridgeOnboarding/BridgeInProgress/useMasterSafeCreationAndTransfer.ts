import { useMutation } from '@tanstack/react-query';

import { TokenSymbol } from '@/enums/Token';
import { useBackupSigner } from '@/hooks/useBackupSigner';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useServices } from '@/hooks/useServices';
import { WalletService } from '@/service/Wallet';
import { BridgingStepStatus } from '@/types/Bridge';

/**
 * Hook to create master safe and transfer funds (step 2 and 3)
 */
export const useMasterSafeCreationAndTransfer = (
  tokenSymbols: TokenSymbol[],
) => {
  const electronApi = useElectronApi();
  const backupSignerAddress = useBackupSigner();
  const { selectedAgentType, selectedAgentConfig } = useServices();

  const chain = selectedAgentConfig.middlewareHomeChainId;

  return useMutation({
    mutationFn: async () => {
      try {
        const response = await WalletService.createSafe(
          chain,
          backupSignerAddress,
        );

        return {
          isSafeCreated: true,
          txnLink: response.create_tx,

          // NOTE: Currently, both creation and transfer are handled in the same API call.
          // Hence, the response contains the transfer status as well.
          masterSafeTransferStatus: 'FINISHED',
          transfers: tokenSymbols.map((symbol) => ({
            symbol,
            status: 'finish' as BridgingStepStatus,
            txnLink: null, // TODO: to integrate
          })),
        };
      } catch (error) {
        console.error('Safe creation failed:', error);
        throw error;
      }
    },
    onSuccess: () => {
      // Since the master safe is created and the transfer is completed,
      // we can update the store to indicate that the agent is initially funded.
      // TODO: logic to be moved to BE in the future.
      electronApi.store?.set?.(`${selectedAgentType}.isInitialFunded`, true);
    },
  });
};
