import { useMutation } from '@tanstack/react-query';

import { TOKEN_CONFIG, TokenSymbol, TokenType } from '@/config/tokens';
import {
  AddressZero,
  BACKUP_SIGNER_CHECKING_MESSAGE,
  BACKUP_SIGNER_NOT_SET_MESSAGE,
  BACKUP_SIGNER_UNAVAILABLE_MESSAGE,
  PAGES,
  SETUP_SCREEN,
} from '@/constants';
import { EXPLORER_URL_BY_MIDDLEWARE_CHAIN } from '@/constants/urls';
import { useLatchedBackupSigner } from '@/context/LatchedBackupSignerContext';
import { useMessageApi } from '@/context/MessageProvider';
import { useBackupSignerState } from '@/hooks/useBackupSigner';
import { useElectronApi } from '@/hooks/useElectronApi';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';
import { useSetup } from '@/hooks/useSetup';
import { BackupWalletError } from '@/service/BackupWalletService';
import { WalletService } from '@/service/Wallet';
import { BridgingStepStatus } from '@/types/Bridge';
import { asEvmChainId } from '@/utils';

import { useBalanceAndRefillRequirementsContext } from '.';

/**
 * Hook to create master safe and transfer funds.
 * Returns status for both safe creation and transfer, allowing independent retry logic.
 */
export const useMasterSafeCreationAndTransfer = (
  tokenSymbols: TokenSymbol[],
) => {
  // A guarded onboarding screen's latched decision wins over the live state.
  const latchedSigner = useLatchedBackupSigner();
  const liveSigner = useBackupSignerState({ forSafeCreation: true });
  const backupSigner = latchedSigner ?? liveSigner;
  const { goto: gotoSetup } = useSetup();
  const { goto: gotoPage } = usePageState();
  const { selectedAgentConfig } = useServices();
  const { refetch } = useBalanceAndRefillRequirementsContext();
  const message = useMessageApi();
  const { logEvent } = useElectronApi();

  const chain = selectedAgentConfig.middlewareHomeChainId;
  const chainTokenConfig = TOKEN_CONFIG[asEvmChainId(chain)];

  return useMutation({
    mutationFn: async () => {
      // Never create the Pearl Safe on a backup signer that is unsettled or needs
      // replacing. (The onboarding funding run creates it in the middleware instead,
      // with the owner FundYourAgent's guard latched.)
      if (backupSigner.state === 'needsNewBackup') {
        throw new BackupWalletError(
          BACKUP_SIGNER_NOT_SET_MESSAGE,
          'SIGNER_NEEDS_NEW_BACKUP',
        );
      }
      if (backupSigner.state === 'error') {
        // Outside a gate (e.g. Main's Complete Agent Setup) nothing else logs why.
        logEvent?.(
          `Safe creation refused, backup signer unavailable: ${backupSigner.reason}`,
        );
        throw new BackupWalletError(
          BACKUP_SIGNER_UNAVAILABLE_MESSAGE,
          'SIGNER_UNAVAILABLE',
        );
      }
      if (backupSigner.state !== 'ready') {
        throw new BackupWalletError(
          BACKUP_SIGNER_CHECKING_MESSAGE,
          'SIGNER_PENDING',
        );
      }
      const { backupSignerAddress } = backupSigner;
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
      // Branch on the reason the refusal was thrown with, not on the live state,
      // which may have moved on since.
      if (
        error instanceof BackupWalletError &&
        (error.code === 'SIGNER_PENDING' ||
          error.code === 'SIGNER_UNAVAILABLE' ||
          error.code === 'SIGNER_NEEDS_NEW_BACKUP')
      ) {
        message.error(error.message);
        if (error.code === 'SIGNER_NEEDS_NEW_BACKUP') {
          // Also from the Main page (Complete Agent Setup), where only changing
          // the setup screen would leave the user looping on Retry.
          gotoSetup(SETUP_SCREEN.SetupBackupSigner);
          gotoPage(PAGES.Setup);
        }
        return;
      }
      message.error('Failed to create master safe.');
    },
  });
};
