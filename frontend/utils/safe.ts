import { EvmChainId, MasterEoa, MasterSafe } from '@/constants';
import { MultisigOwners } from '@/hooks/useMultisig';
import { Address } from '@/types';

export const BACKUP_SIGNER_STATUS = {
  Ready: 'ready',
  HasSafe: 'has_safe',
  Loading: 'loading',
  MissingBackupSigner: 'missing_backup_signer',
  MultipleBackupSigners: 'multiple_backup_signers',
} as const;

export type BackupSignerStatus =
  (typeof BACKUP_SIGNER_STATUS)[keyof typeof BACKUP_SIGNER_STATUS];

export type BackupSignerResolution = {
  status: BackupSignerStatus;
  backupOwner?: Address;
};

/**
 * Resolves whether a safe exists for the chain and, if not, whether we can
 * create one with a single backup owner.
 */
export const resolveBackupSignerForChain = ({
  chainId,
  masterSafes,
  masterSafesOwners,
  masterEoa,
}: {
  chainId: EvmChainId;
  masterSafes?: MasterSafe[];
  masterSafesOwners?: MultisigOwners[];
  masterEoa?: MasterEoa;
}): BackupSignerResolution => {
  if (!masterSafes || !masterSafesOwners) {
    return { status: BACKUP_SIGNER_STATUS.Loading };
  }

  const selectedChainHasMasterSafe = masterSafes.some(
    ({ evmChainId }) => evmChainId === chainId,
  );

  if (selectedChainHasMasterSafe) {
    return { status: BACKUP_SIGNER_STATUS.HasSafe };
  }

  const otherChainOwners = new Set(
    masterSafesOwners
      ?.filter(({ evmChainId }) => evmChainId !== chainId)
      .map((safe) => safe.owners)
      .flat(),
  );

  if (masterEoa) otherChainOwners.delete(masterEoa.address);

  if (otherChainOwners.size <= 0) {
    return { status: BACKUP_SIGNER_STATUS.MissingBackupSigner };
  }

  if (otherChainOwners.size !== 1) {
    return { status: BACKUP_SIGNER_STATUS.MultipleBackupSigners };
  }

  return {
    status: BACKUP_SIGNER_STATUS.Ready,
    backupOwner: [...otherChainOwners][0],
  };
};
