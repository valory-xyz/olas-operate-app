import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { UpdateBackupWalletConfirmScreen } from '../../../../../components/SettingsPage/BackupWallet/UpdateBackupWalletFlow/UpdateBackupWalletConfirmScreen';
import { BackupWalletError } from '../../../../../service/BackupWalletService';

jest.mock('../../../../../constants/providers', () => ({}));

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGoto = jest.fn();
const mockApplyBackupOwner = jest.fn();
const mockSyncBackupOwner = jest.fn();
const mockSetPassword = jest.fn();
const mockResetFlow = jest.fn();

const NEW_ADDRESS = '0x1111111111111111111111111111111111111111';
const CURRENT_ADDRESS = '0x2222222222222222222222222222222222222222';

jest.mock('../../../../../hooks', () => ({
  useSettings: () => ({ goto: mockGoto }),
  useBackupOwnerStatus: () => ({
    backupOwnerStatus: {
      canonical_backup_owner: CURRENT_ADDRESS,
      all_chains_synced: true,
      any_backup_missing: false,
      chains: [],
      chains_without_safe: [],
    },
  }),
  useApplyBackupOwner: () => ({ mutateAsync: mockApplyBackupOwner }),
  useSyncBackupOwner: () => ({ mutateAsync: mockSyncBackupOwner }),
}));

jest.mock(
  '../../../../../components/SettingsPage/BackupWallet/UpdateBackupWalletFlow/UpdateBackupWalletContext',
  () => ({
    useUpdateBackupWallet: () => ({
      newAddress: NEW_ADDRESS,
      password: 'test-password',
      setPassword: mockSetPassword,
      resetFlow: mockResetFlow,
    }),
  }),
);

// Result modal exposes its onRetry via data attribute + a test button so we
// can invoke the parent's branched retry without simulating the real modal UI.
jest.mock(
  '../../../../../components/SettingsPage/BackupWallet/UpdateBackupWalletFlow/UpdateBackupWalletResultModal',
  () => ({
    UpdateBackupWalletResultModal: (props: {
      status: string;
      onRetry: () => Promise<void>;
    }) => (
      <div data-testid="result-modal" data-status={props.status}>
        <button
          type="button"
          data-testid="retry"
          onClick={() => {
            props.onRetry().catch(() => {});
          }}
        >
          Retry
        </button>
      </div>
    ),
  }),
);

jest.mock('../../../../../components/ui', () => ({
  Alert: ({ message }: { message: React.ReactNode }) => <div>{message}</div>,
  BackButton: (props: { onPrev: () => void }) => (
    <button type="button" data-testid="back" onClick={props.onPrev} />
  ),
  cardStyles: {},
}));

jest.mock('../../../../../utils', () => ({
  copyToClipboard: jest.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const clickUpdate = () =>
  fireEvent.click(
    screen.getByRole('button', { name: /Update Backup Wallet/i }),
  );

const clickRetry = () => fireEvent.click(screen.getByTestId('retry'));

// ---------------------------------------------------------------------------
// Tests — retry branching (Finding M2 fix)
// ---------------------------------------------------------------------------

describe('UpdateBackupWalletConfirmScreen — retry branching', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('retry after PARTIAL_FAILURE calls syncBackupOwner, not applyBackupOwner', async () => {
    mockApplyBackupOwner.mockRejectedValueOnce(
      new BackupWalletError(
        'Backup owner update failed on chains: base',
        'PARTIAL_FAILURE',
        ['base'],
      ),
    );
    mockSyncBackupOwner.mockResolvedValueOnce({});

    render(<UpdateBackupWalletConfirmScreen />);
    clickUpdate();

    await waitFor(() => expect(mockApplyBackupOwner).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByTestId('result-modal')).toHaveAttribute(
        'data-status',
        'failure',
      ),
    );

    clickRetry();

    await waitFor(() => expect(mockSyncBackupOwner).toHaveBeenCalledTimes(1));
    expect(mockApplyBackupOwner).toHaveBeenCalledTimes(1);
  });

  it('retry after ALREADY_LINKED calls syncBackupOwner, not applyBackupOwner', async () => {
    mockApplyBackupOwner.mockRejectedValueOnce(
      new BackupWalletError('Wallet Already Linked', 'ALREADY_LINKED'),
    );
    mockSyncBackupOwner.mockResolvedValueOnce({});

    render(<UpdateBackupWalletConfirmScreen />);
    clickUpdate();

    await waitFor(() =>
      expect(screen.getByTestId('result-modal')).toHaveAttribute(
        'data-status',
        'failure',
      ),
    );

    clickRetry();

    await waitFor(() => expect(mockSyncBackupOwner).toHaveBeenCalledTimes(1));
    expect(mockApplyBackupOwner).toHaveBeenCalledTimes(1);
  });

  it('retry after NETWORK_ERROR calls applyBackupOwner again, not sync', async () => {
    mockApplyBackupOwner
      .mockRejectedValueOnce(
        new BackupWalletError('Internal error', 'NETWORK_ERROR'),
      )
      .mockResolvedValueOnce({});

    render(<UpdateBackupWalletConfirmScreen />);
    clickUpdate();

    await waitFor(() =>
      expect(screen.getByTestId('result-modal')).toHaveAttribute(
        'data-status',
        'failure',
      ),
    );

    clickRetry();

    await waitFor(() => expect(mockApplyBackupOwner).toHaveBeenCalledTimes(2));
    expect(mockSyncBackupOwner).not.toHaveBeenCalled();
  });

  it('retry after non-typed error also calls applyBackupOwner (safe default)', async () => {
    mockApplyBackupOwner
      .mockRejectedValueOnce(new Error('unknown'))
      .mockResolvedValueOnce({});

    render(<UpdateBackupWalletConfirmScreen />);
    clickUpdate();

    await waitFor(() =>
      expect(screen.getByTestId('result-modal')).toHaveAttribute(
        'data-status',
        'failure',
      ),
    );

    clickRetry();

    await waitFor(() => expect(mockApplyBackupOwner).toHaveBeenCalledTimes(2));
    expect(mockSyncBackupOwner).not.toHaveBeenCalled();
  });

  it('subsequent retries track the latest error: apply-fail then sync-partial → retry calls sync again', async () => {
    mockApplyBackupOwner.mockRejectedValueOnce(
      new BackupWalletError(
        'Backup owner update failed on chains: base',
        'PARTIAL_FAILURE',
        ['base'],
      ),
    );
    mockSyncBackupOwner
      .mockRejectedValueOnce(
        new BackupWalletError(
          'Backup owner sync failed on chains: base',
          'PARTIAL_FAILURE',
          ['base'],
        ),
      )
      .mockResolvedValueOnce({});

    render(<UpdateBackupWalletConfirmScreen />);
    clickUpdate();

    await waitFor(() =>
      expect(screen.getByTestId('result-modal')).toHaveAttribute(
        'data-status',
        'failure',
      ),
    );

    // First retry → sync (from PARTIAL_FAILURE on apply). Sync also fails partially.
    clickRetry();
    await waitFor(() => expect(mockSyncBackupOwner).toHaveBeenCalledTimes(1));

    // Second retry → still sync (last error is PARTIAL_FAILURE on sync).
    clickRetry();
    await waitFor(() => expect(mockSyncBackupOwner).toHaveBeenCalledTimes(2));
    expect(mockApplyBackupOwner).toHaveBeenCalledTimes(1);
  });
});
