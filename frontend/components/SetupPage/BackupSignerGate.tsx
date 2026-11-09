import { ReactNode } from 'react';

import { CardSkeleton } from '@/components/ui';
import { LatchedBackupSignerContext } from '@/context/LatchedBackupSignerContext';
import { ReadyBackupSigner, useBackupSignerGuard } from '@/hooks';

import { BackupSignerUnavailable } from './BackupSignerUnavailable';

/**
 * Wraps an onboarding screen that creates the Pearl Safe: waits for a settled backup
 * signer (loader, or a retrying error), sends a user who needs a new one back to the
 * backup step, then renders `children` with the latched signer and shares it with Safe
 * creation below through `LatchedBackupSignerContext`.
 */
export const BackupSignerGate = ({
  children,
}: {
  children: (signer: ReadyBackupSigner) => ReactNode;
}) => {
  const { latchedSigner, isBackupSignerError } = useBackupSignerGuard();

  if (isBackupSignerError) return <BackupSignerUnavailable />;
  if (!latchedSigner) return <CardSkeleton />;

  return (
    <LatchedBackupSignerContext.Provider value={latchedSigner}>
      {children(latchedSigner)}
    </LatchedBackupSignerContext.Provider>
  );
};
