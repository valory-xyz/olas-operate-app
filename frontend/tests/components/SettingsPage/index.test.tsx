import { fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react';

import { Settings } from '../../../components/SettingsPage';
import { SettingsScreen, SettingsScreenMap } from '../../../constants/screen';
import {
  useMnemonicExists,
  useRecoveryPhraseBackup,
  useSettings,
} from '../../../hooks';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

jest.mock('../../../hooks', () => ({
  useMnemonicExists: jest.fn(),
  useRecoveryPhraseBackup: jest.fn(),
  useSettings: jest.fn(),
}));

jest.mock('../../../components/SettingsPage/RecoveryModal', () => ({
  RecoveryModal: (props: { open: boolean }) =>
    props.open ? <div data-testid="recovery-modal" /> : null,
}));

jest.mock('../../../components/SettingsPage/SettingsDrawer', () => ({
  SettingsDrawer: (props: { isDrawerOpen: boolean }) =>
    props.isDrawerOpen ? <div data-testid="settings-drawer" /> : null,
}));

jest.mock('../../../components/SettingsPage/BackupWallet', () => ({
  BackupWalletSection: () => <div data-testid="backup-wallet-section" />,
}));

jest.mock(
  '../../../components/SettingsPage/BackupWallet/AddBackupWalletFlow',
  () => ({
    AddBackupWalletMethodScreen: () => (
      <div data-testid="add-backup-wallet-method-screen" />
    ),
    AddBackupWalletManualScreen: () => (
      <div data-testid="add-backup-wallet-manual-screen" />
    ),
  }),
);

jest.mock(
  '../../../components/SettingsPage/BackupWallet/UpdateBackupWalletFlow',
  () => ({
    UpdateBackupWalletMethodScreen: () => (
      <div data-testid="update-backup-wallet-method-screen" />
    ),
    UpdateBackupWalletManualScreen: () => (
      <div data-testid="update-backup-wallet-manual-screen" />
    ),
    UpdateBackupWalletConfirmScreen: () => (
      <div data-testid="update-backup-wallet-confirm-screen" />
    ),
    UpdateBackupWalletPasswordModal: () => null,
    UpdateBackupWalletProvider: ({ children }: { children: React.ReactNode }) =>
      children,
    useUpdateBackupWallet: jest.fn(() => ({
      newAddress: null,
      setNewAddress: jest.fn(),
      sameAddressError: false,
      setSameAddressError: jest.fn(),
      resetFlow: jest.fn(),
    })),
  }),
);

jest.mock('../../../components/ui', () => ({
  Alert: (props: { type: string; message: string; showIcon?: boolean }) => (
    <div
      data-testid="alert"
      data-type={props.type}
      data-message={props.message}
    >
      {props.message}
    </div>
  ),
  CardSection: (props: { children?: React.ReactNode }) => (
    <div>{props.children}</div>
  ),
  cardStyles: {},
  IconContainer: (props: { children?: React.ReactNode }) => (
    <div>{props.children}</div>
  ),
}));

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'styled-components',
  () => require('../../mocks/styledComponents').styledComponentsMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */

// ---------------------------------------------------------------------------
// Typed mock references
// ---------------------------------------------------------------------------

const mockUseSettings = useSettings as jest.Mock;
const mockUseMnemonicExists = useMnemonicExists as jest.Mock;
const mockUseRecoveryPhraseBackup = useRecoveryPhraseBackup as jest.Mock;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Sets up all hooks to a reasonable default state. Individual tests override. */
const setupDefaults = (
  overrides: {
    screen?: SettingsScreen | string;
    mnemonicExists?: boolean;
    isBackedUp?: boolean;
  } = {},
) => {
  const {
    screen = SettingsScreenMap.Main,
    mnemonicExists = true,
    isBackedUp = false,
  } = overrides;

  mockUseSettings.mockReturnValue({ screen, goto: jest.fn() });
  mockUseMnemonicExists.mockReturnValue({ mnemonicExists });
  mockUseRecoveryPhraseBackup.mockReturnValue({ isBackedUp });
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Settings (SettingsPage entry)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('screen routing', () => {
    it('renders SettingsMain content when screen is Main', () => {
      setupDefaults({ screen: SettingsScreenMap.Main });
      render(<Settings />);
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Password')).toBeInTheDocument();
    });

    it('renders AddBackupWalletMethodScreen when screen is AddBackupWalletMethod', () => {
      setupDefaults({ screen: SettingsScreenMap.AddBackupWalletMethod });
      render(<Settings />);
      expect(
        screen.getByTestId('add-backup-wallet-method-screen'),
      ).toBeInTheDocument();
      expect(screen.queryByText('Settings')).not.toBeInTheDocument();
    });

    it('renders AddBackupWalletManualScreen when screen is AddBackupWalletManual', () => {
      setupDefaults({ screen: SettingsScreenMap.AddBackupWalletManual });
      render(<Settings />);
      expect(
        screen.getByTestId('add-backup-wallet-manual-screen'),
      ).toBeInTheDocument();
      expect(screen.queryByText('Settings')).not.toBeInTheDocument();
    });

    it('renders UpdateBackupWalletMethodScreen when screen is UpdateBackupWalletMethod', () => {
      setupDefaults({ screen: SettingsScreenMap.UpdateBackupWalletMethod });
      render(<Settings />);
      expect(
        screen.getByTestId('update-backup-wallet-method-screen'),
      ).toBeInTheDocument();
    });

    it('renders UpdateBackupWalletManualScreen when screen is UpdateBackupWalletManual', () => {
      setupDefaults({ screen: SettingsScreenMap.UpdateBackupWalletManual });
      render(<Settings />);
      expect(
        screen.getByTestId('update-backup-wallet-manual-screen'),
      ).toBeInTheDocument();
    });

    it('renders UpdateBackupWalletConfirmScreen when screen is UpdateBackupWalletConfirm', () => {
      setupDefaults({ screen: SettingsScreenMap.UpdateBackupWalletConfirm });
      render(<Settings />);
      expect(
        screen.getByTestId('update-backup-wallet-confirm-screen'),
      ).toBeInTheDocument();
    });

    it('renders null for an unknown screen value', () => {
      setupDefaults({ screen: 'UnknownScreen' as SettingsScreen });
      const { container } = render(<Settings />);
      expect(container.innerHTML).toBe('');
    });
  });

  describe('BackupWalletSection', () => {
    it('renders BackupWalletSection', () => {
      setupDefaults();
      render(<Settings />);
      expect(screen.getByTestId('backup-wallet-section')).toBeInTheDocument();
    });
  });

  describe('SecretRecoveryPhraseSetting', () => {
    it('does not render when mnemonicExists is false', () => {
      setupDefaults({ mnemonicExists: false });
      render(<Settings />);
      expect(
        screen.queryByText('Secret Recovery Phrase'),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText('Reveal Recovery Phrase'),
      ).not.toBeInTheDocument();
    });

    it('shows warning alert when not backed up', () => {
      setupDefaults({ mnemonicExists: true, isBackedUp: false });
      render(<Settings />);
      const alert = screen.getByTestId('alert');
      expect(alert).toHaveAttribute('data-type', 'warning');
      expect(alert).toHaveAttribute(
        'data-message',
        'Secret Recovery Phrase not backed up.',
      );
    });

    it('shows success alert when backed up', () => {
      setupDefaults({ mnemonicExists: true, isBackedUp: true });
      render(<Settings />);
      const alert = screen.getByTestId('alert');
      expect(alert).toHaveAttribute('data-type', 'success');
      expect(alert).toHaveAttribute(
        'data-message',
        'Secret Recovery Phrase backed up.',
      );
    });

    it('opens RecoveryModal when "Reveal Recovery Phrase" is clicked', () => {
      setupDefaults({ mnemonicExists: true });
      render(<Settings />);
      expect(screen.queryByTestId('recovery-modal')).not.toBeInTheDocument();
      act(() => {
        fireEvent.click(screen.getByText('Reveal Recovery Phrase'));
      });
      expect(screen.getByTestId('recovery-modal')).toBeInTheDocument();
    });
  });

  describe('DefaultSettingsSection', () => {
    it('renders "View Default Settings" button', () => {
      setupDefaults();
      render(<Settings />);
      expect(screen.getByText('View Default Settings')).toBeInTheDocument();
    });

    it('opens SettingsDrawer when "View Default Settings" is clicked', () => {
      setupDefaults();
      render(<Settings />);
      expect(screen.queryByTestId('settings-drawer')).not.toBeInTheDocument();
      act(() => {
        fireEvent.click(screen.getByText('View Default Settings'));
      });
      expect(screen.getByTestId('settings-drawer')).toBeInTheDocument();
    });
  });

  describe('SettingsScreenMap constant', () => {
    it('exports all expected screens', () => {
      expect(SettingsScreenMap).toEqual({
        Main: 'Main',
        AddBackupWalletMethod: 'AddBackupWalletMethod',
        AddBackupWalletManual: 'AddBackupWalletManual',
        UpdateBackupWalletMethod: 'UpdateBackupWalletMethod',
        UpdateBackupWalletManual: 'UpdateBackupWalletManual',
        UpdateBackupWalletConfirm: 'UpdateBackupWalletConfirm',
      });
    });
  });
});
