import { CHAIN_CONFIG } from '@/config/chains';
import { TOKEN_CONFIG } from '@/config/tokens';
import {
  AddressZero,
  ChainImageMap,
  EvmChainId,
  SupportedMiddlewareChain,
} from '@/constants';
import { Address } from '@/types';
import { ExtendedWallet, RecoveryFundingRequirements } from '@/types/Recovery';
import {
  areAddressesEqual,
  asEvmChainId,
  asMiddlewareChain,
  formatUnitsToNumber,
} from '@/utils';

import { TokenRequirementsRow } from '../ui';

/**
 * Gets the backup wallet status by comparing backup owners across all safes.
 * - If all backup owners are the same across chains, recovery can proceed.
 * - If any chain is missing backup owners, recovery cannot proceed.
 */
export const getBackupWalletStatus = (
  safes: ExtendedWallet['safes'],
  masterSafes: { address: Address; evmChainId: EvmChainId }[],
) => {
  const backupList: {
    chain: SupportedMiddlewareChain;
    address: Address;
    owners: string[];
  }[] = [];

  for (const { address: untypedAddress, evmChainId } of masterSafes) {
    const masterSafeAddress = untypedAddress as Address;
    const chain = asMiddlewareChain(evmChainId);
    const safe = safes[chain][masterSafeAddress];
    backupList.push({
      chain,
      address: masterSafeAddress,
      owners: safe.backup_owners ?? [],
    });
  }

  const hasBackupWalletsAcrossEveryChain = backupList.every(
    (item) => item.owners.length > 0,
  );

  const areAllBackupOwnersSame = backupList.every((outer, _, arr) =>
    arr.every((inner) => {
      const a = outer.owners;
      const b = inner.owners;
      if (a.length !== b.length) return false;
      const A = a.map((s) => s.toLowerCase()).sort();
      const B = b.map((s) => s.toLowerCase()).sort();
      return A.every((v, i) => v === B[i]);
    }),
  );

  return {
    backupAddress: backupList[0]?.owners?.[0],
    hasBackupWalletsAcrossEveryChain,
    areAllBackupOwnersSame,
  };
};

/**
 * Parses the recovery funding requirements into a list of token requirement rows
 */
export const parseRecoveryFundingRequirements = (
  fundingRequirements: RecoveryFundingRequirements,
): TokenRequirementsRow[] => {
  const rows: TokenRequirementsRow[] = [];
  const { refill_requirements, total_requirements } = fundingRequirements;

  for (const [chainName, backupOwnerAddresses] of Object.entries(
    refill_requirements,
  )) {
    const chain = chainName as SupportedMiddlewareChain;
    const evmChainId = asEvmChainId(chain);

    // Iterate through each address of the backup owner
    for (const [safeAddress, tokenBalances] of Object.entries(
      backupOwnerAddresses,
    )) {
      // Iterate through each token that needs refilling
      for (const [untypedTokenAddress, refillAmount] of Object.entries(
        tokenBalances,
      )) {
        const tokenAddress = untypedTokenAddress as Address;
        const totalAmount =
          total_requirements[chain]?.[safeAddress as Address]?.[tokenAddress] ??
          0;

        const tokenConfig = (() => {
          const config = Object.values(TOKEN_CONFIG[evmChainId]).find((token) =>
            areAddressesEqual(token?.address, tokenAddress),
          );
          if (!config && tokenAddress === AddressZero) {
            return CHAIN_CONFIG[evmChainId].nativeToken;
          }
          return config;
        })();

        if (!tokenConfig) continue;

        const { decimals, symbol } = tokenConfig;
        rows.push({
          symbol,
          totalAmount: Number(
            formatUnitsToNumber(String(totalAmount ?? 0), decimals),
          ),
          pendingAmount: Number(
            formatUnitsToNumber(String(refillAmount), decimals),
          ),
          iconSrc: ChainImageMap[evmChainId],
          areFundsReceived: refillAmount === 0,
          chainName: chain,
        });
      }
    }
  }

  return rows;
};
