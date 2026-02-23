import { useCallback } from 'react';

import { EvmChainId } from '@/constants/chains';
import { useMasterWalletContext } from '@/hooks';
import { useMultisigs } from '@/hooks/useMultisig';
import { WalletService } from '@/service/Wallet';
import {
  BACKUP_SIGNER_STATUS,
  resolveBackupSignerForChain,
} from '@/utils/safe';

import { AgentMeta } from '../types';

export const useSafeEligibility = () => {
  const { masterSafes, masterEoa } = useMasterWalletContext();
  const { masterSafesOwners } = useMultisigs(masterSafes);

  const canCreateSafeForChain = useCallback(
    (chainId: EvmChainId) => {
      const resolution = resolveBackupSignerForChain({
        chainId,
        masterSafes,
        masterSafesOwners,
        masterEoa,
      });

      if (resolution.status === BACKUP_SIGNER_STATUS.HasSafe) {
        return { ok: true };
      }
      if (resolution.status === BACKUP_SIGNER_STATUS.Ready) {
        return { ok: true };
      }

      return {
        ok: false,
        reason:
          resolution.status === BACKUP_SIGNER_STATUS.MissingBackupSigner
            ? 'Backup signer required'
            : resolution.status === BACKUP_SIGNER_STATUS.MultipleBackupSigners
              ? 'Multiple backup signers detected'
              : 'Safe data loading',
      };
    },
    [masterEoa, masterSafes, masterSafesOwners],
  );

  const createSafeIfNeeded = useCallback(
    async (meta: AgentMeta) => {
      const resolution = resolveBackupSignerForChain({
        chainId: meta.agentConfig.evmHomeChainId,
        masterSafes,
        masterSafesOwners,
        masterEoa,
      });

      if (resolution.status === BACKUP_SIGNER_STATUS.HasSafe) return;
      if (
        resolution.status !== BACKUP_SIGNER_STATUS.Ready ||
        !resolution.backupOwner
      ) {
        throw new Error('Safe eligibility failed');
      }

      await WalletService.createSafe(
        meta.agentConfig.middlewareHomeChainId,
        resolution.backupOwner,
      );
    },
    [masterEoa, masterSafes, masterSafesOwners],
  );

  return { canCreateSafeForChain, createSafeIfNeeded };
};
