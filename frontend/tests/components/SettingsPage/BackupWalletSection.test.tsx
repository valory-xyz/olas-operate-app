import { render, screen } from '@testing-library/react';

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

jest.mock('../../../hooks', () => ({
  useSettings: () => ({ goto: mockGoto }),
  useBackupOwnerStatus: () => ({ backupOwnerStatus: mockBackupOwnerStatus }),
}));

jest.mock('usehooks-ts', () => ({
  useBoolean: (initial: boolean) => ({
    value: initial,
    setTrue: initial ? mockOpenSync : mockOpenUpdatePassword,
    setFalse: initial ? mockCloseSync : mockCloseUpdatePassword,
  }),
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
    mockBackupOwnerStatus = undefined;
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
});
