import { getAddress } from 'ethers/lib/utils';
import { useCallback } from 'react';

import { BackupWalletError } from '@/service/BackupWalletService';
import { Address } from '@/types/Address';

import { useApplyBackupOwner } from './useApplyBackupOwner';
import { useSetup } from './useSetup';

/**
 * Writes `canonical_backup_owner` to the wallet file right after the user
 * picks a backup wallet during onboarding.
 *
 * Why:
 *   The setup flow's legacy Safe-creation (`POST /api/wallet/safe`) applies
 *   the backup owner on-chain but never writes `canonical_backup_owner`.
 *   Without that field, Settings routes to State A ("No backup wallet added")
 *   until the backend's startup auto-migration picks it up — which can't
 *   happen before any Safe exists on-chain.
 *
 *   `PUT /api/wallet/safe { chain: "all" }` with no Safes does zero on-chain
 *   work — it just writes the canonical field to `wallet.json`. No gas,
 *   no funds required. Then the normal legacy flow creates Safes later,
 *   and Settings already shows State B from the moment the user lands there.
 *
 * Password flow:
 *   `SetupPassword` stores the password in SetupContext after login succeeds.
 *   This hook reads it, passes it to the bulk apply, and clears it
 *   immediately so it doesn't linger in React state.
 *
 * Fallback:
 *   If the password is missing — e.g. user reopened Pearl mid-setup and the
 *   in-memory SetupContext was re-initialised — this hook is a silent no-op.
 *   The user's backup address is still stored in `pearl_store` and applied
 *   on-chain by the legacy flow; the backend's startup auto-migration
 *   populates canonical once Safes deploy.
 */
export const useApplyBackupDuringSetup = () => {
  const { password, setPassword } = useSetup();
  const { mutateAsync: applyBackupOwner } = useApplyBackupOwner();

  return useCallback(
    async (address: Address): Promise<void> => {
      if (!password) return;

      // Backend skips EIP-55 checksumming when no Safes exist yet, so we must
      // checksum on the frontend to guarantee a well-formed canonical value.
      const checksummed = getAddress(address.toLowerCase()) as Address;

      try {
        await applyBackupOwner({
          backup_owner: checksummed,
          password,
        });
      } catch (e) {
        // ALREADY_LINKED means canonical is already set to this address — e.g.
        // user restarted mid-setup and re-submitted the same backup. Treat as
        // a no-op success so onboarding isn't interrupted by a scary toast.
        if (e instanceof BackupWalletError && e.code === 'ALREADY_LINKED') {
          setPassword(null);
          return;
        }
        throw e;
      }
      setPassword(null);
    },
    [applyBackupOwner, password, setPassword],
  );
};
