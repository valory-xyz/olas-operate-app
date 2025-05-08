import { useMutation } from '@tanstack/react-query';
import { useMemo } from 'react';

import { AddressBalanceRecord } from '@/client';
import { TokenSymbol } from '@/enums/Token';
import { useBackupSigner } from '@/hooks/useBackupSigner';
import { useBalanceAndRefillRequirementsContext } from '@/hooks/useBalanceAndRefillRequirementsContext';
import { useServices } from '@/hooks/useServices';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { WalletService } from '@/service/Wallet';
import { Address } from '@/types/Address';
import { BridgingStepStatus } from '@/types/Bridge';
import { bigintMax } from '@/utils/calculations';

/**
 * Hook to create master safe and transfer funds (step 2 and 3)
 */
export const useMasterSafeCreationAndTransfer = (
  tokenSymbols: TokenSymbol[],
) => {
  const backupSignerAddress = useBackupSigner();
  const { masterEoa } = useMasterWalletContext();
  const {
    isBalancesAndFundingRequirementsLoading,
    balances,
    totalRequirements,
  } = useBalanceAndRefillRequirementsContext();
  const { selectedAgentConfig } = useServices();

  const chain = selectedAgentConfig.middlewareHomeChainId;

  const initialFunds = useMemo(() => {
    if (isBalancesAndFundingRequirementsLoading) return;
    if (!balances) return;
    if (!masterEoa) return;

    return Object.entries(balances[masterEoa.address]).reduce(
      (acc, [tokenAddress, tokenBalance]) => {
        /**
         * @example
         * {
         *   [0xMasterEoaAddress]: { 0x00000000...: amount, 0x00000001...: amount }
         * }
         * */
        const totalAmountRequiredByMasterEoaToken =
          (totalRequirements as AddressBalanceRecord)?.[masterEoa.address]?.[
            tokenAddress as Address
          ] || 0;

        /**
         * @note Need to keep some funds in the EOA for gas, and transfer the rest to the master safe.
         * Amount to transfer to master safe = (amount available in EOA - amount required by master EOA)
         *
         * @example
         * - EOA has "10 ETH" (User's balance)
         * - Master EOA requires just "2 ETH"
         * - Amount to transfer to master safe = 10 - 2 = "8 ETH"
         */
        const amountToTransferToMasterSafe = bigintMax(
          BigInt(tokenBalance) - BigInt(totalAmountRequiredByMasterEoaToken),
          BigInt(0),
        );
        acc[tokenAddress as Address] = amountToTransferToMasterSafe.toString();

        return acc;
      },
      {} as Record<Address, string>,
    );
  }, [
    isBalancesAndFundingRequirementsLoading,
    masterEoa,
    balances,
    totalRequirements,
  ]);

  return useMutation({
    mutationFn: async () => {
      if (!initialFunds) return;

      try {
        const response = await WalletService.createSafe(
          chain,
          backupSignerAddress,
          initialFunds,
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
