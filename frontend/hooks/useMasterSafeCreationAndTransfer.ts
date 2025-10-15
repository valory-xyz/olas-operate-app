import { useMutation } from '@tanstack/react-query';
import { message } from 'antd';

import { TOKEN_CONFIG, TokenType } from '@/config/tokens';
import { AddressZero } from '@/constants';
import { TokenSymbol } from '@/constants/token';
import { EXPLORER_URL_BY_MIDDLEWARE_CHAIN } from '@/constants/urls';
import { useBackupSigner } from '@/hooks/useBackupSigner';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useServices } from '@/hooks/useServices';
import { WalletService } from '@/service/Wallet';
import { BridgingStepStatus } from '@/types/Bridge';
import { asEvmChainId } from '@/utils';

import { useBalanceAndRefillRequirementsContext } from '.';

/**
 * Hook to create master safe and transfer funds.
 */
export const useMasterSafeCreationAndTransfer = (
  tokenSymbols: TokenSymbol[],
) => {
  const electronApi = useElectronApi();
  const backupSignerAddress = useBackupSigner();
  const { selectedAgentType, selectedAgentConfig } = useServices();
  const { refetch } = useBalanceAndRefillRequirementsContext();

  const chain = selectedAgentConfig.middlewareHomeChainId;
  const chainTokenConfig = TOKEN_CONFIG[asEvmChainId(chain)];

  return useMutation({
    mutationFn: async () => {
      try {
        const response = await WalletService.createSafe(
          chain,
          backupSignerAddress,
        );

        return {
          isSafeCreated: true,
          txnLink: `${EXPLORER_URL_BY_MIDDLEWARE_CHAIN[chain]}/tx/${response.create_tx}`,

          // NOTE: Currently, both creation and transfer are handled in the same API call.
          // Hence, the response contains the transfer status as well.
          masterSafeTransferStatus: 'FINISHED',
          transfers: tokenSymbols.map((symbol) => {
            const tokenDetails = chainTokenConfig[symbol];
            if (!tokenDetails) {
              throw new Error(
                `Token config not found for symbol: ${symbol} on chain: ${chain}`,
              );
            }

            const { tokenType, address } = tokenDetails;
            const tokenAddress =
              tokenType === TokenType.NativeGas ? AddressZero : address;
            const transferTxn = response.transfer_txs[tokenAddress];
            const txnLink = transferTxn
              ? `${EXPLORER_URL_BY_MIDDLEWARE_CHAIN[chain]}/tx/${transferTxn}`
              : null;
            return {
              symbol,
              status: 'finish' as BridgingStepStatus,
              txnLink,
            };
          }),
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
      // Refetch funding requirements because balances are changed
      refetch?.();
    },
    onError: (error) => {
      console.error(error);
      message.error('Failed to create master safe.');
    },
  });
};
