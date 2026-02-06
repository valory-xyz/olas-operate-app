import { useMutation } from '@tanstack/react-query';
import { keys } from 'lodash';

import { TOKEN_CONFIG, TokenSymbol, TokenType } from '@/config/tokens';
import { AddressZero } from '@/constants';
import { EXPLORER_URL_BY_MIDDLEWARE_CHAIN } from '@/constants/urls';
import { useMessageApi } from '@/context/MessageProvider';
import { useBackupSigner } from '@/hooks/useBackupSigner';
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
  const backupSignerAddress = useBackupSigner();
  const { selectedAgentConfig } = useServices();
  const { refetch } = useBalanceAndRefillRequirementsContext();
  const message = useMessageApi();

  const chain = selectedAgentConfig.middlewareHomeChainId;
  const chainTokenConfig = TOKEN_CONFIG[asEvmChainId(chain)];

  return useMutation({
    mutationFn: async () => {
      try {
        // await delayInSeconds(5); // Adding delay to ensure the backup signer is ready before making the API call
        // throw new Error('Simulated master safe creation failure'); // Simulating an error for testing purposes --- IGNORE ---

        const response = await WalletService.createSafe(
          chain,
          backupSignerAddress,
        );
        const { transfer_errors, transfer_txs, create_tx, status } = response;
        const hasTransferErrors = keys(transfer_errors).length > 0;

        const explorer = `${EXPLORER_URL_BY_MIDDLEWARE_CHAIN[chain]}/tx`;

        // Details related to safe creation
        const isSafeCreated = status !== 'SAFE_CREATION_FAILED';
        const safeCreationDetails = {
          isSafeCreated,
          txnLink: create_tx ? `${explorer}/${create_tx}` : null,
          status: isSafeCreated ? 'finish' : 'error',
        };

        //  details related to transfers (NOTE: to be split into different API)
        const isTransferComplete = status === 'SAFE_CREATED_TRANSFER_COMPLETED';
        const transferDetails = {
          isTransferComplete,
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
            const isTransferFailed = Boolean(transfer_errors?.[tokenAddress]);
            const transferTxn = isTransferFailed
              ? transfer_errors[tokenAddress]
              : transfer_txs[tokenAddress];
            const txnLink = transferTxn ? `${explorer}/${transferTxn}` : null;
            const status = (
              isTransferFailed ? 'error' : 'finish'
            ) as BridgingStepStatus;

            return {
              symbol,
              status,
              txnLink,
            };
          }),
        };

        return {
          /** @deprecated */
          isSafeCreated: !hasTransferErrors,
          /** @deprecated */
          txnLink: response.create_tx
            ? `${EXPLORER_URL_BY_MIDDLEWARE_CHAIN[chain]}/tx/${response.create_tx}`
            : null,

          // NOTE: Currently, both creation and transfer are handled in the same API call.
          // Hence, the response contains the transfer status as well.
          /** @deprecated */
          masterSafeTransferStatus: hasTransferErrors ? 'FAILED' : 'FINISHED',
          /** @deprecated */
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
            const isTransferFailed = Boolean(
              response.transfer_errors?.[tokenAddress],
            );
            const status = (
              isTransferFailed ? 'error' : 'finish'
            ) as BridgingStepStatus;

            return {
              symbol,
              status,
              txnLink,
            };
          }),

          safeCreationDetails,
          transferDetails,
        };
      } catch (error) {
        console.error('Safe creation failed:', error);
        throw error;
      }
    },
    onSuccess: () => {
      // Refetch funding requirements because balances are changed
      refetch?.();
    },
    onError: (error) => {
      console.error(error);
      message.error('Failed to create master safe.');
    },
  });
};
