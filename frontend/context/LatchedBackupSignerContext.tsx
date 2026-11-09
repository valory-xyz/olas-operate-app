import { createContext, useContext } from 'react';

import type { BackupSignerState } from '@/hooks/useBackupSigner';

/**
 * The backup signer an onboarding screen latched (see `useBackupSignerGuard`). Safe creation
 * below that screen reads it instead of the live state, so a status change mid-flow can't
 * refuse or change the owner the user started with.
 */
export const LatchedBackupSignerContext = createContext<Extract<
  BackupSignerState,
  { state: 'ready' }
> | null>(null);

export const useLatchedBackupSigner = () =>
  useContext(LatchedBackupSignerContext);
