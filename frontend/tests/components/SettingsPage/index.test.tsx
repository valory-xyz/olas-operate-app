import { fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react';

import { Settings } from '../../../components/SettingsPage';
import { SettingsScreen, SettingsScreenMap } from '../../../constants/screen';
import {
  useElectronApi,
  useLatchedWeb3AuthEnabled,
  useMnemonicExists,
  useRecoveryPhraseBackup,
  useSettings,
  useStore,
} from '../../../hooks';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

const mockStoreSet = jest.fn();

jest.mock('../../../hooks', () => ({
  useElectronApi: jest.fn(),
  useMnemonicExists: jest.fn(),
  useRecoveryPhraseBackup: jest.fn(),
  useSettings: jest.fn(),
  useStore: jest.fn(),
  useLatchedWeb3AuthEnabled: jest.fn(),
}));

jest.mock('../../../components/SettingsPage/UpdatePassword', () => ({
  UpdatePasswordScreen: () => <div data-testid="update-password-screen" />,
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
    AddBackupWalletPasswordModal: () => null,
    AddBackupWalletProvider: ({ children }: { children: React.ReactNode }) =>
      children,
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
  CardSkeleton: () => <div data-testid="card-skeleton" />,
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
const mockUseElectronApi = useElectronApi as jest.Mock;
const mockUseStore = useStore as jest.Mock;
const mockUseLatchedWeb3AuthEnabled = useLatchedWeb3AuthEnabled as jest.Mock;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Sets up all hooks to a reasonable default state. Individual tests override. */
const setupDefaults = (
  overrides: {
    screen?: SettingsScreen | string;
    mnemonicExists?: boolean;
    isBackedUp?: boolean;
    keepDeviceAwake?: boolean;
    isWeb3AuthEnabled?: boolean;
  } = {},
) => {
  const {
    screen = SettingsScreenMap.Main,
    mnemonicExists = true,
    isBackedUp = false,
    keepDeviceAwake = false,
    isWeb3AuthEnabled = true,
  } = overrides;

  mockUseLatchedWeb3AuthEnabled.mockReturnValue(isWeb3AuthEnabled);

  mockUseSettings.mockReturnValue({ screen, goto: jest.fn() });
  mockUseMnemonicExists.mockReturnValue({ mnemonicExists });
  mockUseRecoveryPhraseBackup.mockReturnValue({ isBackedUp });
  mockUseElectronApi.mockReturnValue({ store: { set: mockStoreSet } });
  mockUseStore.mockReturnValue({
    storeState: { keepDeviceAwake },
  });
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

    it('renders AddBackupWalletManualScreen for AddBackupWalletMethod when Web3Auth is disabled', () => {
      setupDefaults({
        screen: SettingsScreenMap.AddBackupWalletMethod,
        isWeb3AuthEnabled: false,
      });
      render(<Settings />);
      expect(
        screen.getByTestId('add-backup-wallet-manual-screen'),
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId('add-backup-wallet-method-screen'),
      ).not.toBeInTheDocument();
    });

    it('renders UpdateBackupWalletManualScreen for UpdateBackupWalletMethod when Web3Auth is disabled', () => {
      setupDefaults({
        screen: SettingsScreenMap.UpdateBackupWalletMethod,
        isWeb3AuthEnabled: false,
      });
      render(<Settings />);
      expect(
        screen.getByTestId('update-backup-wallet-manual-screen'),
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId('update-backup-wallet-method-screen'),
      ).not.toBeInTheDocument();
    });

    it('shows a loader, not the address screen, on a method screen while the status loads', () => {
      setupDefaults({ screen: SettingsScreenMap.AddBackupWalletMethod });
      mockUseLatchedWeb3AuthEnabled.mockReturnValue(undefined);
      const { rerender } = render(<Settings />);
      expect(screen.getByTestId('card-skeleton')).toBeInTheDocument();
      expect(
        screen.queryByTestId('add-backup-wallet-manual-screen'),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('add-backup-wallet-method-screen'),
      ).not.toBeInTheDocument();

      mockUseLatchedWeb3AuthEnabled.mockReturnValue(true);
      rerender(<Settings />);
      expect(
        screen.getByTestId('add-backup-wallet-method-screen'),
      ).toBeInTheDocument();
    });

    it('shows a loader on the Update method screen while the status loads, then the method screen once enabled', () => {
      setupDefaults({ screen: SettingsScreenMap.UpdateBackupWalletMethod });
      mockUseLatchedWeb3AuthEnabled.mockReturnValue(undefined);
      const { rerender } = render(<Settings />);
      expect(screen.getByTestId('card-skeleton')).toBeInTheDocument();
      expect(
        screen.queryByTestId('update-backup-wallet-manual-screen'),
      ).not.toBeInTheDocument();

      mockUseLatchedWeb3AuthEnabled.mockReturnValue(true);
      rerender(<Settings />);
      expect(
        screen.getByTestId('update-backup-wallet-method-screen'),
      ).toBeInTheDocument();
    });

    it('does not hold other Settings screens behind the status', () => {
      setupDefaults({ screen: SettingsScreenMap.Main });
      mockUseLatchedWeb3AuthEnabled.mockReturnValue(undefined);
      render(<Settings />);
      expect(screen.queryByTestId('card-skeleton')).not.toBeInTheDocument();
      expect(screen.getByText('Password')).toBeInTheDocument();
    });

    it.each([
      SettingsScreenMap.AddBackupWalletMethod,
      SettingsScreenMap.UpdateBackupWalletMethod,
    ])('decides Web3Auth once per entry into %s', (methodScreen) => {
      setupDefaults({ screen: methodScreen });
      render(<Settings />);
      expect(mockUseLatchedWeb3AuthEnabled).toHaveBeenCalledWith(methodScreen);
    });

    it.each([
      SettingsScreenMap.Main,
      SettingsScreenMap.UpdateBackupWalletManual,
    ])('clears the Web3Auth decision on %s', (otherScreen) => {
      setupDefaults({ screen: otherScreen });
      render(<Settings />);
      expect(mockUseLatchedWeb3AuthEnabled).toHaveBeenCalledWith(null);
    });

    it('renders UpdateBackupWalletConfirmScreen when screen is UpdateBackupWalletConfirm', () => {
      setupDefaults({ screen: SettingsScreenMap.UpdateBackupWalletConfirm });
      render(<Settings />);
      expect(
        screen.getByTestId('update-backup-wallet-confirm-screen'),
      ).toBeInTheDocument();
    });

    it('renders UpdatePasswordScreen when screen is UpdatePassword', () => {
      setupDefaults({ screen: SettingsScreenMap.UpdatePassword });
      render(<Settings />);
      expect(screen.getByTestId('update-password-screen')).toBeInTheDocument();
      expect(screen.queryByText('Settings')).not.toBeInTheDocument();
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

  describe('Password section', () => {
    it('renders "Update Password" button on main settings', () => {
      setupDefaults();
      render(<Settings />);
      expect(screen.getByText('Update Password')).toBeInTheDocument();
    });

    it('navigates to UpdatePassword screen when "Update Password" is clicked', () => {
      const mockGoto = jest.fn();
      mockUseSettings.mockReturnValue({
        screen: SettingsScreenMap.Main,
        goto: mockGoto,
      });
      mockUseMnemonicExists.mockReturnValue({ mnemonicExists: true });
      mockUseRecoveryPhraseBackup.mockReturnValue({ isBackedUp: false });

      render(<Settings />);
      act(() => {
        fireEvent.click(screen.getByText('Update Password'));
      });
      expect(mockGoto).toHaveBeenCalledWith(SettingsScreenMap.UpdatePassword);
    });
  });

  describe('KeepDeviceAwakeSetting', () => {
    it('renders toggle unchecked when keepDeviceAwake is undefined', () => {
      setupDefaults();
      mockUseStore.mockReturnValue({ storeState: {} });
      render(<Settings />);
      expect(screen.getByText('Keep Device Awake')).toBeInTheDocument();
      expect(screen.getByRole('switch')).not.toBeChecked();
    });

    it('renders toggle checked when keepDeviceAwake is true', () => {
      setupDefaults({ keepDeviceAwake: true });
      render(<Settings />);
      expect(screen.getByRole('switch')).toBeChecked();
    });

    it('calls store.set with true when toggled on', () => {
      setupDefaults({ keepDeviceAwake: false });
      render(<Settings />);
      act(() => {
        fireEvent.click(screen.getByRole('switch'));
      });
      expect(mockStoreSet).toHaveBeenCalledWith('keepDeviceAwake', true);
    });

    it('calls store.set with false when toggled off', () => {
      setupDefaults({ keepDeviceAwake: true });
      render(<Settings />);
      act(() => {
        fireEvent.click(screen.getByRole('switch'));
      });
      expect(mockStoreSet).toHaveBeenCalledWith('keepDeviceAwake', false);
    });

    it('always shows the disclaimer text regardless of toggle state', () => {
      setupDefaults({ keepDeviceAwake: false });
      render(<Settings />);
      expect(
        screen.getByText(
          'Your device stays awake while auto-run is active. On laptops, closing the lid may still trigger sleep, and battery use may be higher.',
        ),
      ).toBeInTheDocument();
    });

    it('shows "Off" label when toggle is unchecked', () => {
      setupDefaults({ keepDeviceAwake: false });
      render(<Settings />);
      expect(screen.getByText('Off')).toBeInTheDocument();
    });

    it('shows "On" label when toggle is checked', () => {
      setupDefaults({ keepDeviceAwake: true });
      render(<Settings />);
      expect(screen.getByText('On')).toBeInTheDocument();
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
        UpdatePassword: 'UpdatePassword',
      });
    });
  });
});
