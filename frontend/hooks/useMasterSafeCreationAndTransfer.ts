import { useMutation } from '@tanstack/react-query';
import { useRef } from 'react';

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
  // Using ref to track if the safe was previously created to avoid step status going back to 'wait'
  // in case of safe creation failure after the safe has been created successfully once.
  // This is a workaround and API will be split into two separate APIs.
  const wasSafePreviouslyCreated = useRef(false);
  const backupSignerAddress = useBackupSigner();
  const { selectedAgentConfig } = useServices();
  const { refetch } = useBalanceAndRefillRequirementsContext();
  const message = useMessageApi();

  const chain = selectedAgentConfig.middlewareHomeChainId;
  const chainTokenConfig = TOKEN_CONFIG[asEvmChainId(chain)];

  return useMutation({
    mutationFn: async () => {
      const explorer = `${EXPLORER_URL_BY_MIDDLEWARE_CHAIN[chain]}/tx`;
      try {
        const response = await WalletService.createSafe(
          chain,
          backupSignerAddress,
        );
        const { transfer_errors, transfer_txs, create_tx, status } = response;

        // Details related to safe creation
        const isSafeCreatedNow =
          status === 'SAFE_EXISTS_ALREADY_FUNDED'
            ? true
            : status !== 'SAFE_CREATION_FAILED';
        if (isSafeCreatedNow) wasSafePreviouslyCreated.current = true;
        const isSafeCreated =
          isSafeCreatedNow || wasSafePreviouslyCreated.current;
        const safeCreationDetails = {
          isSafeCreated,
          txnLink: create_tx ? `${explorer}/${create_tx}` : null,
          status: isSafeCreated ? 'finish' : 'error',
        };

        //  details related to transfers (NOTE: to be split into different API)
        const isTransferComplete =
          status === 'SAFE_EXISTS_ALREADY_FUNDED' ||
          status === 'SAFE_CREATED_TRANSFER_COMPLETED';
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
              isTransferFailed ? 'error' : !transferTxn ? 'wait' : 'finish'
            ) as BridgingStepStatus;

            return {
              symbol,
              status,
              txnLink,
            };
          }),
        };

        return { safeCreationDetails, transferDetails };
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
