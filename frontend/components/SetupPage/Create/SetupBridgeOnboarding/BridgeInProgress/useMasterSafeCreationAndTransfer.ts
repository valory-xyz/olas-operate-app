import { useMutation } from '@tanstack/react-query';

import { TokenSymbol } from '@/enums/Token';
import { useBackupSigner } from '@/hooks/useBackupSigner';
import { useServices } from '@/hooks/useServices';
import { WalletService } from '@/service/Wallet';
import { BridgingStepStatus } from '@/types/Bridge';

/**
 * Hook to create master safe and transfer funds (step 2 and 3)
 */
export const useMasterSafeCreationAndTransfer = (
  tokenSymbols: TokenSymbol[],
) => {
  const backupSignerAddress = useBackupSigner();
  const { selectedAgentConfig } = useServices();

  const chain = selectedAgentConfig.middlewareHomeChainId;

  return useMutation({
    mutationFn: async () => {
      try {
        const response = await WalletService.createSafe(
          chain,
          backupSignerAddress,
          true, // transfer excess assets ("true" for bridge onboarding)
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
  });
};
