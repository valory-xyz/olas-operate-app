import React from 'react';

/**
 * Shared jest mock for `BackupSignerGate`, for specs of the screens it wraps.
 *
 * The gate's own loader, error view and context sharing are covered by
 * `BackupSignerGate.test.tsx`; screen specs only need it open (rendering
 * `children` with `backupSignerGateState.signer`) or closed (a
 * `gate-waiting` button that calls the screen's `onBack`). If the gate's props
 * change, update this one helper instead of a copy in each spec.
 *
 * Usage:
 *
 *   jest.mock('../../../../components/SetupPage/BackupSignerGate', () => ({
 *     BackupSignerGate: require('../../../helpers/backupSignerGateMock').backupSignerGateMock,
 *   }));
 *
 * then set `backupSignerGateState.isOpen` / `.signer` in a test, and call
 * `resetBackupSignerGateState()` in `afterEach`.
 */
type BackupSignerGateState = {
  isOpen: boolean;
  signer: { state: 'ready'; backupSignerAddress?: string };
};

const initialBackupSignerGateState = (): BackupSignerGateState => ({
  isOpen: true,
  signer: { state: 'ready' },
});

export const backupSignerGateState = initialBackupSignerGateState();

export const resetBackupSignerGateState = () => {
  Object.assign(backupSignerGateState, initialBackupSignerGateState());
};

export const backupSignerGateMock = ({
  children,
  onBack,
}: {
  children: (signer: unknown) => React.ReactNode;
  onBack: () => void;
}) =>
  backupSignerGateState.isOpen ? (
    <>{children(backupSignerGateState.signer)}</>
  ) : (
    <button data-testid="gate-waiting" onClick={onBack} />
  );
