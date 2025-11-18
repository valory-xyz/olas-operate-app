import { EvmChainId, SupportedMiddlewareChain } from '@/constants';
import { Address } from '@/types';
import { ExtendedWallet } from '@/types/Recovery';
import { asMiddlewareChain } from '@/utils';

/**
 *
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
