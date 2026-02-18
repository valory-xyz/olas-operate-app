import { entries } from 'lodash';

import { CHAIN_CONFIG } from '@/config/chains';
import { TOKEN_CONFIG } from '@/config/tokens';
import {
  AddressZero,
  CHAIN_IMAGE_MAP,
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

  const areAllBackupOwnersSame = backupList.every((currentItem) =>
    backupList.every((compareItem) => {
      const currentOwners = currentItem.owners;
      const compareOwners = compareItem.owners;

      if (currentOwners.length !== compareOwners.length) return false;

      const normalizeOwners = (owners: string[]) =>
        owners.map((address) => address.toLowerCase()).sort();
      const normalizedCurrentOwners = normalizeOwners(currentOwners);
      const normalizedCompareOwners = normalizeOwners(compareOwners);

      return normalizedCurrentOwners.every(
        (address, index) => address === normalizedCompareOwners[index],
      );
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

  for (const [chainName, backupOwnerAddresses] of entries(
    refill_requirements,
  )) {
    const chain = chainName as SupportedMiddlewareChain;
    const evmChainId = asEvmChainId(chain);

    for (const [safeAddress, tokenBalances] of entries(backupOwnerAddresses)) {
      for (const [untypedTokenAddress, refillAmount] of entries(
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
          chainName: chain,
          symbol,
          totalAmount: Number(
            formatUnitsToNumber(BigInt(totalAmount ?? 0), decimals),
          ),
          pendingAmount: Number(
            formatUnitsToNumber(BigInt(refillAmount), decimals),
          ),
          iconSrc: CHAIN_IMAGE_MAP[evmChainId],
          areFundsReceived: BigInt(refillAmount) === 0n,
        });
      }
    }
  }

  return rows;
};

/**
 * Checks if all backup owner swaps have been completed across all chains.
 * A swap is considered pending if there are any safe addresses with incomplete swaps.
 */
export const checkNewMasterEoaSwapStatus = (
  pendingBackupOwnerSwaps: RecoveryFundingRequirements['pending_backup_owner_swaps'],
) => {
  const chainsWithPendingSwaps: SupportedMiddlewareChain[] = [];

  for (const [chainName, safesWithPendingSwaps] of Object.entries(
    pendingBackupOwnerSwaps,
  )) {
    const chain = chainName as SupportedMiddlewareChain;

    // If this chain has any safes with pending swaps, add it to the list
    if (safesWithPendingSwaps.length > 0) {
      chainsWithPendingSwaps.push(chain);
    }
  }

  return {
    areAllSwapsCompleted: chainsWithPendingSwaps.length === 0,
    chainsWithPendingSwaps,
  };
};
