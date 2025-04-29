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

// hook to create master safe and transfer funds (step 2 and 3)
export const useMasterSafeCreationAndTransfer = (
  tokenSymbols: TokenSymbol[],
) => {
  const backupSignerAddress = useBackupSigner();
  const { masterEoa } = useMasterWalletContext();
  const {
    isBalancesAndFundingRequirementsLoading,
    balances,
    refillRequirements,
  } = useBalanceAndRefillRequirementsContext();
  const { selectedAgentConfig } = useServices();

  const chain = selectedAgentConfig.middlewareHomeChainId;

  const initialFunds = useMemo(() => {
    if (isBalancesAndFundingRequirementsLoading) return;
    if (!balances) return;
    if (!masterEoa) return;

    return Object.entries(balances[masterEoa.address]).reduce(
      (acc, [tokenAddress, tokenBalance]) => {
        /** @example { [0xMasterEoaAddress]: { 0x00000000...: amount } } */
        const requiredAmountsByMasterEoa = (
          refillRequirements as AddressBalanceRecord
        )?.[masterEoa.address];

        if (!requiredAmountsByMasterEoa) return acc;

        const amountRequiredByMasterEoaCurrentToken =
          requiredAmountsByMasterEoa[tokenAddress as Address] || 0;

        // NOTE: Need to keep some funds in the EOA for gas, and transfer the rest to the master safe.
        // Amount to transfer to master safe =
        //   (EOA balance - amount required by master EOA)
        const amountToTransferToMasterSafe = bigintMax(
          BigInt(tokenBalance) - BigInt(amountRequiredByMasterEoaCurrentToken),
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
    refillRequirements,
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
          txnLink: response.safe_creation_explorer_link || null,

          // NOTE: Currently, both creation and transfer are handled in the same API call.
          // Hence, the response contains the transfer status as well.
          masterSafeTransferStatus: 'FINISHED',
          transfers: tokenSymbols.map((symbol) => ({
            symbol,
            status: 'finish' as BridgingStepStatus,
            txnLink: null, // BE does not return the txn link yet
          })),
        };
      } catch (error) {
        console.error('Safe creation failed:', error);
        throw error;
      }
    },
  });
};
