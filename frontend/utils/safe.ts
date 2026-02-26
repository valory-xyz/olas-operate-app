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

type BackupSignerStatus =
  (typeof BACKUP_SIGNER_STATUS)[keyof typeof BACKUP_SIGNER_STATUS];

type BackupSignerResolution = {
  status: BackupSignerStatus;
  backupOwner?: Address;
};

/**
 * Resolves whether a safe exists for the chain and, if not,
 * whether we can create one with a single backup owner.
 */
const resolveBackupSignerForChain = ({
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

  // 1. If there's already a safe for the selected chain, we're good to go.
  const selectedChainHasMasterSafe = masterSafes.some(
    ({ evmChainId }) => evmChainId === chainId,
  );
  if (selectedChainHasMasterSafe) {
    return { status: BACKUP_SIGNER_STATUS.HasSafe };
  }

  // Otherwise, we need to find a backup signer that can be used to create a safe.
  const otherChainOwners = new Set(
    masterSafesOwners
      .filter(({ evmChainId }) => evmChainId !== chainId)
      .map((safe) => safe.owners)
      .flat(),
  );

  // 2. remove master eoa from the set, to find backup signers
  if (masterEoa) {
    otherChainOwners.delete(masterEoa.address);
  }

  // 3. if there are no signers, the user needs to add a backup signer
  if (otherChainOwners.size <= 0) {
    return { status: BACKUP_SIGNER_STATUS.MissingBackupSigner };
  }

  if (otherChainOwners.size !== 1) {
    return { status: BACKUP_SIGNER_STATUS.MultipleBackupSigners };
  }

  // 4. otherwise, create a new safe with the same signer
  return {
    status: BACKUP_SIGNER_STATUS.Ready,
    backupOwner: [...otherChainOwners][0],
  };
};

type SafeEligibility = {
  canProceed: boolean;
  shouldCreateSafe: boolean;
  backupOwner?: Address;
  status: BackupSignerStatus;
};

/**
 * Determines whether the user can proceed with the safe creation flow
 * based on their current safe and backup signer configuration.
 */
export const getSafeEligibility = ({
  chainId,
  masterSafes,
  masterSafesOwners,
  masterEoa,
}: {
  chainId: EvmChainId;
  masterSafes?: MasterSafe[];
  masterSafesOwners?: MultisigOwners[];
  masterEoa?: MasterEoa;
}): SafeEligibility => {
  const resolution = resolveBackupSignerForChain({
    chainId,
    masterSafes,
    masterSafesOwners,
    masterEoa,
  });

  // If the safe already exists, the user can proceed without creating a new safe.
  if (resolution.status === BACKUP_SIGNER_STATUS.HasSafe) {
    return {
      status: resolution.status,
      canProceed: true,
      shouldCreateSafe: false,
    };
  }

  // If the safe doesn't exist but we have a backup signer ready,
  // the user can proceed and we should create a new safe.
  if (resolution.status === BACKUP_SIGNER_STATUS.Ready) {
    return {
      status: resolution.status,
      canProceed: true,
      shouldCreateSafe: true,
      backupOwner: resolution.backupOwner,
    };
  }

  // Otherwise, the user cannot proceed until they resolve their backup signer situation.
  return {
    status: resolution.status,
    canProceed: false,
    shouldCreateSafe: false,
  };
};

export const getSafeEligibilityMessage = (status: BackupSignerStatus) => {
  switch (status) {
    case BACKUP_SIGNER_STATUS.MissingBackupSigner:
      return 'A backup signer is required to create a new safe on the home chain. Please add a backup signer.';
    case BACKUP_SIGNER_STATUS.MultipleBackupSigners:
      return 'The same backup signer address must be used on all chains. Please remove any extra backup signers.';
    case BACKUP_SIGNER_STATUS.Loading:
    default:
      return 'Safe data is still loading. Please wait a moment and try again.';
  }
};
