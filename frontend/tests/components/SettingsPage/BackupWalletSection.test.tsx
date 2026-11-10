import { fireEvent, render, screen } from '@testing-library/react';

import { BackupWalletSection } from '../../../components/SettingsPage/BackupWallet';
import { BackupOwnerStatus } from '../../../types/BackupWallet';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

const mockGoto = jest.fn();
const mockOpenSync = jest.fn();
const mockCloseSync = jest.fn();
const mockOpenUpdatePassword = jest.fn();
const mockCloseUpdatePassword = jest.fn();

let mockBackupOwnerStatus: BackupOwnerStatus | undefined;
let mockIsUpdatePromptVisible = false;

jest.mock('../../../hooks', () => ({
  useSettings: () => ({ goto: mockGoto }),
  useBackupOwnerStatus: () => ({ backupOwnerStatus: mockBackupOwnerStatus }),
  useBackupWalletUpdatePrompt: () => ({
    isUpdatePromptVisible: mockIsUpdatePromptVisible,
  }),
}));

// BackupWalletSection calls useBoolean three times per render, in this order:
// add-password, update-password, sync. Give each its own opener.
const mockOpenAddPassword = jest.fn();
let mockBooleanCall = 0;
jest.mock('usehooks-ts', () => ({
  useBoolean: (initial: boolean) => {
    const openers = [mockOpenAddPassword, mockOpenUpdatePassword, mockOpenSync];
    const closers = [jest.fn(), mockCloseUpdatePassword, mockCloseSync];
    const index = mockBooleanCall++ % 3;
    return {
      value: initial,
      setTrue: openers[index],
      setFalse: closers[index],
    };
  },
}));

jest.mock(
  '../../../components/SettingsPage/BackupWallet/SyncBackupWalletModal',
  () => ({
    SyncBackupWalletModal: () => null,
  }),
);

jest.mock(
  '../../../components/SettingsPage/BackupWallet/UpdateBackupWalletFlow',
  () => ({
    UpdateBackupWalletPasswordModal: () => null,
  }),
);

jest.mock(
  '../../../components/SettingsPage/BackupWallet/AddBackupWalletFlow',
  () => ({
    AddBackupWalletPasswordModal: () => null,
    AddBackupWalletProvider: ({ children }: { children: React.ReactNode }) =>
      children,
  }),
);

jest.mock('../../../components/ui', () => ({
  AddressLink: ({ address }: { address: string }) => (
    <span data-testid="address-link">{address}</span>
  ),
  Alert: ({
    message,
    type,
  }: {
    message: React.ReactNode;
    type: string;
    showIcon?: boolean;
  }) => (
    <div data-testid="alert" data-type={type}>
      {message}
    </div>
  ),
  CardSection: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="card-section">{children}</div>
  ),
  IconContainer: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'styled-components',
  () => require('../../mocks/styledComponents').styledComponentsMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */

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

describe('BackupWalletSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBooleanCall = 0;
    mockBackupOwnerStatus = undefined;
    mockIsUpdatePromptVisible = false;
  });

  describe('loading state (no data)', () => {
    it('renders placeholder with dash when backupOwnerStatus is undefined', () => {
      mockBackupOwnerStatus = undefined;
      render(<BackupWalletSection />);
      expect(screen.getByText('Backup Wallet')).toBeInTheDocument();
      // mdash rendered
      expect(screen.queryByTestId('alert')).not.toBeInTheDocument();
      expect(screen.queryByText('Add Backup Wallet')).not.toBeInTheDocument();
    });
  });

  describe('State A: no backup wallet', () => {
    it('renders warning alert with "Your funds are at risk!"', () => {
      mockBackupOwnerStatus = makeStatus({
        canonical_backup_owner: null,
        any_backup_missing: true,
      });
      render(<BackupWalletSection />);
      expect(screen.getByText('Backup Wallet')).toBeInTheDocument();
      expect(screen.getByText('No backup wallet added.')).toBeInTheDocument();
      expect(screen.getByTestId('alert')).toHaveAttribute(
        'data-type',
        'warning',
      );
      expect(screen.getByText('Your funds are at risk!')).toBeInTheDocument();
      expect(screen.getByText('Add Backup Wallet')).toBeInTheDocument();
    });

    it('does not render Update or Sync buttons', () => {
      mockBackupOwnerStatus = makeStatus({ canonical_backup_owner: null });
      render(<BackupWalletSection />);
      expect(
        screen.queryByText('Update Backup Wallet'),
      ).not.toBeInTheDocument();
      expect(screen.queryByText('Sync Now')).not.toBeInTheDocument();
    });
  });

  describe('State B: backup set and in sync', () => {
    it('renders address and Update button', () => {
      mockBackupOwnerStatus = makeStatus({
        canonical_backup_owner: '0xAa72b201fc49e0837648d5c8a89fCeD3eAb1364f',
        all_chains_synced: true,
      });
      render(<BackupWalletSection />);
      expect(screen.getByText('Backup Wallet')).toBeInTheDocument();
      expect(screen.getByTestId('address-link')).toHaveTextContent(
        '0xAa72b201fc49e0837648d5c8a89fCeD3eAb1364f',
      );
      expect(screen.getByText('Update Backup Wallet')).toBeInTheDocument();
    });

    it('does not render alert or Sync button', () => {
      mockBackupOwnerStatus = makeStatus({
        canonical_backup_owner: '0xAa72b201fc49e0837648d5c8a89fCeD3eAb1364f',
        all_chains_synced: true,
      });
      render(<BackupWalletSection />);
      expect(screen.queryByTestId('alert')).not.toBeInTheDocument();
      expect(screen.queryByText('Sync Now')).not.toBeInTheDocument();
    });
  });

  describe('State C: backup set but out of sync', () => {
    it('renders address, out-of-sync alert with Sync Now, and Update button', () => {
      mockBackupOwnerStatus = makeStatus({
        canonical_backup_owner: '0xAa72b201fc49e0837648d5c8a89fCeD3eAb1364f',
        all_chains_synced: false,
        any_backup_missing: true,
      });
      render(<BackupWalletSection />);
      expect(screen.getByText('Backup Wallet')).toBeInTheDocument();
      expect(screen.getByTestId('address-link')).toBeInTheDocument();
      expect(screen.getByTestId('alert')).toHaveAttribute(
        'data-type',
        'warning',
      );
      expect(screen.getByText('Backup Wallet Out of Sync')).toBeInTheDocument();
      expect(screen.getByText('Sync Now')).toBeInTheDocument();
      expect(screen.getByText('Update Backup Wallet')).toBeInTheDocument();
    });

    it('does not render "Out of Sync" tag', () => {
      mockBackupOwnerStatus = makeStatus({
        canonical_backup_owner: '0xAa72b201fc49e0837648d5c8a89fCeD3eAb1364f',
        all_chains_synced: false,
      });
      render(<BackupWalletSection />);
      expect(screen.queryByText('Out of Sync')).not.toBeInTheDocument();
    });
  });

  describe('Update Recommended: Google/Apple backup to replace', () => {
    beforeEach(() => {
      mockIsUpdatePromptVisible = true;
    });

    it('renders the address and the recommendation warning with its copy', () => {
      mockBackupOwnerStatus = makeStatus({
        canonical_backup_owner: '0xAa72b201fc49e0837648d5c8a89fCeD3eAb1364f',
      });
      render(<BackupWalletSection />);
      expect(screen.getByTestId('address-link')).toHaveTextContent(
        '0xAa72b201fc49e0837648d5c8a89fCeD3eAb1364f',
      );
      expect(screen.getByTestId('alert')).toHaveAttribute(
        'data-type',
        'warning',
      );
      expect(
        screen.getByText('Backup Wallet Update Recommended'),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          'We recommend a hardware wallet or a wallet with its own seed phrase as your backup, so you keep full control of recovery.',
        ),
      ).toBeInTheDocument();
      expect(screen.getAllByText('Update Backup Wallet')).toHaveLength(1);
    });

    it('opens the existing Update flow from the warning button', () => {
      mockBackupOwnerStatus = makeStatus({
        canonical_backup_owner: '0xAa72b201fc49e0837648d5c8a89fCeD3eAb1364f',
      });
      render(<BackupWalletSection />);
      fireEvent.click(screen.getByText('Update Backup Wallet'));
      expect(mockOpenUpdatePassword).toHaveBeenCalled();
      expect(mockOpenSync).not.toHaveBeenCalled();
    });

    it('is shown instead of the out-of-sync warning', () => {
      mockBackupOwnerStatus = makeStatus({
        canonical_backup_owner: '0xAa72b201fc49e0837648d5c8a89fCeD3eAb1364f',
        all_chains_synced: false,
        any_backup_missing: true,
      });
      render(<BackupWalletSection />);
      expect(
        screen.getByText('Backup Wallet Update Recommended'),
      ).toBeInTheDocument();
      expect(
        screen.queryByText('Backup Wallet Out of Sync'),
      ).not.toBeInTheDocument();
    });

    it('keeps "No backup wallet added" when there is no backup wallet', () => {
      mockBackupOwnerStatus = makeStatus({ canonical_backup_owner: null });
      render(<BackupWalletSection />);
      expect(screen.getByText('No backup wallet added.')).toBeInTheDocument();
      expect(
        screen.queryByText('Backup Wallet Update Recommended'),
      ).not.toBeInTheDocument();
    });
  });

  it('wires "Sync Now" to the sync opener, not the update one', () => {
    mockBackupOwnerStatus = makeStatus({
      canonical_backup_owner: '0xAa72b201fc49e0837648d5c8a89fCeD3eAb1364f',
      all_chains_synced: false,
      any_backup_missing: true,
    });
    render(<BackupWalletSection />);
    fireEvent.click(screen.getByText('Sync Now'));
    expect(mockOpenSync).toHaveBeenCalled();
    expect(mockOpenUpdatePassword).not.toHaveBeenCalled();
  });
});
