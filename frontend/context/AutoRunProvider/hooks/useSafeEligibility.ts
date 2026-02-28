import { useCallback } from 'react';

import { EvmChainId } from '@/constants/chains';
import { useMasterWalletContext } from '@/hooks';
import { useMultisigs } from '@/hooks/useMultisig';
import { WalletService } from '@/service/Wallet';
import { BACKUP_SIGNER_STATUS, getSafeEligibility } from '@/utils/safe';

import { AgentMeta } from '../types';

/**
 * Safe readiness utilities for auto-run.
 *
 * Example:
 * - `optimus` selected on chain X
 * - if master safe exists -> can proceed
 * - if backup signer missing -> returns blocker reason
 */
export const useSafeEligibility = () => {
  const { masterSafes, masterEoa } = useMasterWalletContext();
  const { masterSafesOwners } = useMultisigs(masterSafes);

  const canCreateSafeForChain = useCallback(
    (chainId: EvmChainId) => {
      // Pure readiness check used by deployability gating.
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

  // Executes safe creation only when the eligibility contract says it is required.
  // Throws for non-actionable states so caller can treat it as a start blocker.
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
