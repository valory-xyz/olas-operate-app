import { useCallback } from 'react';

import { EvmChainId } from '@/constants/chains';
import { useMasterWalletContext } from '@/hooks';
import { useMultisigs } from '@/hooks/useMultisig';
import { WalletService } from '@/service/Wallet';
import { BACKUP_SIGNER_STATUS, getSafeEligibility } from '@/utils/safe';

import { AgentMeta } from '../types';

/**
 * Hook to determine the eligibility of creating a Safe
 * for a given chain and to create it if needed, based on
 * the master wallet's current state and the agent's requirements.
 */
export const useSafeEligibility = () => {
  const { masterSafes, masterEoa } = useMasterWalletContext();
  const { masterSafesOwners } = useMultisigs(masterSafes);

  const canCreateSafeForChain = useCallback(
    (chainId: EvmChainId) => {
      const eligibility = getSafeEligibility({
        chainId,
        masterSafes,
        masterSafesOwners,
        masterEoa,
      });

      const isLoading = eligibility.status === BACKUP_SIGNER_STATUS.Loading;

      if (eligibility.status === BACKUP_SIGNER_STATUS.HasSafe) {
        return { ok: true, isLoading: false };
      }
      if (eligibility.status === BACKUP_SIGNER_STATUS.Ready) {
        return { ok: true, isLoading: false };
      }

      const reason = (() => {
        if (eligibility.status === BACKUP_SIGNER_STATUS.MissingBackupSigner) {
          return 'Backup signer required';
        }
        if (eligibility.status === BACKUP_SIGNER_STATUS.MultipleBackupSigners) {
          return 'Multiple backup signers detected';
        }
        return 'Safe data loading';
      })();

      return { ok: false, reason, isLoading };
    },
    [masterEoa, masterSafes, masterSafesOwners],
  );

  // Creates a Safe if the eligibility check determines
  // it's needed and possible, otherwise throws an error.
  const createSafeIfNeeded = useCallback(
    async (meta: AgentMeta) => {
      const eligibility = getSafeEligibility({
        chainId: meta.agentConfig.evmHomeChainId,
        masterSafes,
        masterSafesOwners,
        masterEoa,
      });

      if (eligibility.status === BACKUP_SIGNER_STATUS.HasSafe) return;

      if (
        !eligibility.canProceed ||
        !eligibility.shouldCreateSafe ||
        !eligibility.backupOwner
      ) {
        throw new Error('Safe eligibility failed');
      }

      await WalletService.createSafe(
        meta.agentConfig.middlewareHomeChainId,
        eligibility.backupOwner,
      );
    },
    [masterEoa, masterSafes, masterSafesOwners],
  );

  return { canCreateSafeForChain, createSafeIfNeeded };
};
