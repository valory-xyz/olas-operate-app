import { useMutation } from '@tanstack/react-query';

import { TOKEN_CONFIG, TokenSymbol, TokenType } from '@/config/tokens';
import { AddressZero } from '@/constants';
import { EXPLORER_URL_BY_MIDDLEWARE_CHAIN } from '@/constants/urls';
import { useMessageApi } from '@/context/MessageProvider';
import { useBackupSignerState } from '@/hooks/useBackupSigner';
import { useServices } from '@/hooks/useServices';
import { WalletService } from '@/service/Wallet';
import { BridgingStepStatus } from '@/types/Bridge';
import { asEvmChainId } from '@/utils';

import { useBalanceAndRefillRequirementsContext } from '.';

export const BACKUP_SIGNER_NOT_READY =
  'The backup wallet is not set. Set a backup wallet, then try again.';

/**
 * Hook to create master safe and transfer funds.
 * Returns status for both safe creation and transfer, allowing independent retry logic.
 */
export const useMasterSafeCreationAndTransfer = (
  tokenSymbols: TokenSymbol[],
) => {
  const {
    backupSignerAddress,
    isPending: isBackupSignerPending,
    needsNewBackup,
  } = useBackupSignerState();
  const { selectedAgentConfig } = useServices();
  const { refetch } = useBalanceAndRefillRequirementsContext();
  const message = useMessageApi();

  const chain = selectedAgentConfig.middlewareHomeChainId;
  const chainTokenConfig = TOKEN_CONFIG[asEvmChainId(chain)];

  return useMutation({
    mutationFn: async () => {
      // Every path that creates the Pearl Safe goes through here: never create it on a
      // backup signer that is unsettled or needs replacing.
      if (isBackupSignerPending || needsNewBackup) {
        throw new Error(BACKUP_SIGNER_NOT_READY);
      }
      const explorer = `${EXPLORER_URL_BY_MIDDLEWARE_CHAIN[chain]}/tx`;
      try {
        const response = await WalletService.createSafe(
          chain,
          backupSignerAddress,
        );
        const { transfer_errors, transfer_txs, create_tx, status } = response;

        // Details related to safe creation
        // Only true if safe was created in THIS call
        const isSafeCreated = status !== 'SAFE_CREATION_FAILED';
        const safeCreationDetails = {
          isSafeCreated,
          txnLink: create_tx ? `${explorer}/${create_tx}` : null,
          status: isSafeCreated ? ('finish' as const) : ('error' as const),
        };

        //  details related to transfers (NOTE: to be split into different API)
        // `SAFE_EXISTS_TRANSFER_COMPLETED` covers the common case where the
        // master safe already exists on the chain (e.g. the user already runs
        // another agent there) and the funding sweep just completed — without
        // it the setup flow strands the user on the funding page.
        const isTransferComplete =
          status === 'SAFE_CREATED_TRANSFER_COMPLETED' ||
          status === 'SAFE_EXISTS_TRANSFER_COMPLETED' ||
          status === 'SAFE_EXISTS_ALREADY_FUNDED';
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

            return { symbol, status, txnLink };
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
