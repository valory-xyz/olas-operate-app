import { fireEvent, render, screen } from '@testing-library/react';

import { BackupWalletAlert } from '../../../../components/MainPage/Sidebar/BackupWalletAlert';
import { PAGES } from '../../../../constants';
import { BackupOwnerStatus } from '../../../../types/BackupWallet';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

const mockGotoPage = jest.fn();
let mockBackupOwnerStatus: BackupOwnerStatus | undefined;

jest.mock('../../../../hooks', () => ({
  useBackupOwnerStatus: () => ({ backupOwnerStatus: mockBackupOwnerStatus }),
  usePageState: () => ({ goto: mockGotoPage }),
}));

jest.mock(
  '../../../../components/SettingsPage/BackupWallet/SyncBackupWalletModal',
  () => ({
    SyncBackupWalletModal: (props: { open: boolean }) =>
      props.open ? <div data-testid="sync-modal" /> : null,
  }),
);

jest.mock('../../../../components/ui', () => ({
  Alert: (props: { message: string; type: string; onClick?: () => void }) => (
    <button
      type="button"
      data-testid="alert"
      data-type={props.type}
      onClick={props.onClick}
    >
      {props.message}
    </button>
  ),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeStatus = (
  overrides: Partial<BackupOwnerStatus> = {},
): BackupOwnerStatus => ({
  canonical_backup_owner: null,
  all_chains_synced: true,
  any_backup_missing: false,
  existing_backup_on_any_chain: false,
  chains: [],
  chains_without_safe: [],
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BackupWalletAlert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBackupOwnerStatus = undefined;
  });

  describe('visibility', () => {
    it('hides alert when status is undefined (loading)', () => {
      mockBackupOwnerStatus = undefined;
      const { container } = render(<BackupWalletAlert />);
      expect(container.innerHTML).toBe('');
    });

    it('hides alert when backup exists and all chains synced', () => {
      mockBackupOwnerStatus = makeStatus({
        canonical_backup_owner: '0xABC',
        all_chains_synced: true,
        any_backup_missing: false,
      });
      const { container } = render(<BackupWalletAlert />);
      expect(container.innerHTML).toBe('');
    });
  });

  describe('Add variant (no canonical set)', () => {
    it('renders "Add backup wallet" when no canonical exists', () => {
      mockBackupOwnerStatus = makeStatus({
        canonical_backup_owner: null,
        any_backup_missing: true,
      });
      render(<BackupWalletAlert />);
      expect(screen.getByText('Add backup wallet')).toBeInTheDocument();
    });

    it('navigates to Settings on click', () => {
      mockBackupOwnerStatus = makeStatus({
        canonical_backup_owner: null,
        any_backup_missing: true,
      });
      render(<BackupWalletAlert />);
      fireEvent.click(screen.getByTestId('alert'));
      expect(mockGotoPage).toHaveBeenCalledWith(PAGES.Settings);
    });
  });

  describe('Sync variant (canonical set, out of sync)', () => {
    it('renders "Sync backup wallet" when canonical set but not synced', () => {
      mockBackupOwnerStatus = makeStatus({
        canonical_backup_owner: '0xABC',
        all_chains_synced: false,
        any_backup_missing: true,
      });
      render(<BackupWalletAlert />);
      expect(screen.getByText('Sync backup wallet')).toBeInTheDocument();
    });

    it('opens sync modal on click, does NOT navigate', () => {
      mockBackupOwnerStatus = makeStatus({
        canonical_backup_owner: '0xABC',
        all_chains_synced: false,
        any_backup_missing: true,
      });
      render(<BackupWalletAlert />);
      expect(screen.queryByTestId('sync-modal')).not.toBeInTheDocument();
      fireEvent.click(screen.getByTestId('alert'));
      expect(screen.getByTestId('sync-modal')).toBeInTheDocument();
      expect(mockGotoPage).not.toHaveBeenCalled();
    });
  });
});
