import { fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react';

import { Settings } from '../../../components/SettingsPage';
import { NA } from '../../../constants';
import { EvmChainIdMap, MiddlewareChainMap } from '../../../constants/chains';
import { SettingsScreen, SettingsScreenMap } from '../../../constants/screen';
import {
  useFeatureFlag,
  useMasterWalletContext,
  useMnemonicExists,
  useMultisig,
  useRecoveryPhraseBackup,
  useServices,
  useSettings,
} from '../../../hooks';
import {
  BACKUP_SIGNER_ADDRESS,
  DEFAULT_EOA_ADDRESS,
  DEFAULT_SAFE_ADDRESS,
  makeMasterEoa,
  makeMasterSafe,
} from '../../helpers/factories';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

jest.mock('../../../hooks', () => ({
  useFeatureFlag: jest.fn(),
  useMasterWalletContext: jest.fn(),
  useMnemonicExists: jest.fn(),
  useMultisig: jest.fn(),
  useRecoveryPhraseBackup: jest.fn(),
  useServices: jest.fn(),
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

jest.mock('../../../components/SettingsPage/YourFundsAtRiskAlert', () => ({
  YourFundsAtRiskAlert: () => <div data-testid="funds-at-risk-alert" />,
}));

jest.mock('../../../components/ui', () => ({
  AddressLink: (props: { address: string; middlewareChain: string }) => (
    <div
      data-testid="address-link"
      data-address={props.address}
      data-chain={props.middlewareChain}
    />
  ),
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
const mockUseFeatureFlag = useFeatureFlag as jest.Mock;
const mockUseServices = useServices as jest.Mock;
const mockUseMasterWalletContext = useMasterWalletContext as jest.Mock;
const mockUseMultisig = useMultisig as jest.Mock;
const mockUseMnemonicExists = useMnemonicExists as jest.Mock;
const mockUseRecoveryPhraseBackup = useRecoveryPhraseBackup as jest.Mock;

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const mockSelectedAgentConfig = {
  evmHomeChainId: EvmChainIdMap.Gnosis,
  middlewareHomeChainId: MiddlewareChainMap.GNOSIS,
};

const mockMasterSafe = makeMasterSafe(
  EvmChainIdMap.Gnosis,
  DEFAULT_SAFE_ADDRESS,
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Sets up all hooks to a reasonable default state. Individual tests override. */
const setupDefaults = (
  overrides: {
    screen?: SettingsScreen | string;
    isBackupViaSafeEnabled?: boolean;
    masterSafes?: ReturnType<typeof makeMasterSafe>[] | undefined;
    isWalletsLoading?: boolean;
    owners?: string[] | null | undefined;
    ownersIsFetched?: boolean;
    mnemonicExists?: boolean;
    isBackedUp?: boolean;
  } = {},
) => {
  const {
    screen = SettingsScreenMap.Main,
    isBackupViaSafeEnabled = true,
    masterSafes = [mockMasterSafe],
    isWalletsLoading = false,
    owners = [DEFAULT_EOA_ADDRESS, BACKUP_SIGNER_ADDRESS],
    ownersIsFetched = true,
    mnemonicExists = true,
    isBackedUp = false,
  } = overrides;

  mockUseSettings.mockReturnValue({ screen });
  mockUseFeatureFlag.mockReturnValue(isBackupViaSafeEnabled);
  mockUseServices.mockReturnValue({
    selectedAgentConfig: mockSelectedAgentConfig,
  });
  mockUseMasterWalletContext.mockReturnValue({
    masterEoa: makeMasterEoa(DEFAULT_EOA_ADDRESS),
    masterSafes,
    isLoading: isWalletsLoading,
  });
  mockUseMultisig.mockReturnValue({ owners, ownersIsFetched });
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

    it('renders null for an unknown screen value', () => {
      setupDefaults({ screen: 'UnknownScreen' as SettingsScreen });
      const { container } = render(<Settings />);
      expect(container.innerHTML).toBe('');
    });
  });

  describe('backup wallet display logic', () => {
    it('shows N/A when not loading and no masterSafe', () => {
      setupDefaults({
        masterSafes: [],
        isWalletsLoading: false,
        ownersIsFetched: true,
        owners: null,
      });
      render(<Settings />);
      expect(screen.getByText(NA)).toBeInTheDocument();
    });

    it('shows skeleton when owners are not yet fetched', () => {
      setupDefaults({
        ownersIsFetched: false,
        owners: undefined,
      });
      render(<Settings />);
      // Ant Design Skeleton.Input renders with class ant-skeleton
      const skeleton = document.querySelector('.ant-skeleton');
      expect(skeleton).toBeInTheDocument();
    });

    it('shows "No backup wallet added." when ownersIsFetched but no backup address', () => {
      setupDefaults({
        owners: [DEFAULT_EOA_ADDRESS],
        ownersIsFetched: true,
      });
      render(<Settings />);
      expect(screen.getByText('No backup wallet added.')).toBeInTheDocument();
    });

    it('shows AddressLink when a backup address exists', () => {
      setupDefaults({
        owners: [DEFAULT_EOA_ADDRESS, BACKUP_SIGNER_ADDRESS],
        ownersIsFetched: true,
      });
      render(<Settings />);
      const addressLink = screen.getByTestId('address-link');
      expect(addressLink).toBeInTheDocument();
      expect(addressLink).toHaveAttribute(
        'data-address',
        BACKUP_SIGNER_ADDRESS,
      );
      expect(addressLink).toHaveAttribute(
        'data-chain',
        MiddlewareChainMap.GNOSIS,
      );
    });

    it('hides wallet section when backup-via-safe is disabled and no backup address', () => {
      setupDefaults({
        isBackupViaSafeEnabled: false,
        owners: [DEFAULT_EOA_ADDRESS],
        ownersIsFetched: true,
      });
      render(<Settings />);
      expect(screen.queryByText('Backup Wallet')).not.toBeInTheDocument();
    });

    it('shows wallet section when backup-via-safe is enabled even without backup address', () => {
      setupDefaults({
        isBackupViaSafeEnabled: true,
        owners: [DEFAULT_EOA_ADDRESS],
        ownersIsFetched: true,
      });
      render(<Settings />);
      expect(screen.getByText('Backup Wallet')).toBeInTheDocument();
    });

    it('shows wallet section when backup-via-safe is disabled but backup address exists', () => {
      setupDefaults({
        isBackupViaSafeEnabled: false,
        owners: [DEFAULT_EOA_ADDRESS, BACKUP_SIGNER_ADDRESS],
        ownersIsFetched: true,
      });
      render(<Settings />);
      expect(screen.getByText('Backup Wallet')).toBeInTheDocument();
    });
  });

  describe('masterSafeBackupAddresses derivation', () => {
    it('filters out the masterEoa address (case-insensitive)', () => {
      const mixedCaseEoa =
        DEFAULT_EOA_ADDRESS.toUpperCase() as typeof DEFAULT_EOA_ADDRESS;
      mockUseMasterWalletContext.mockReturnValue({
        masterEoa: makeMasterEoa(mixedCaseEoa),
        masterSafes: [mockMasterSafe],
        isLoading: false,
      });
      setupDefaults({
        owners: [
          DEFAULT_EOA_ADDRESS.toLowerCase() as typeof DEFAULT_EOA_ADDRESS,
          BACKUP_SIGNER_ADDRESS,
        ],
        ownersIsFetched: true,
      });
      // Re-set masterEoa after setupDefaults since it overrides
      mockUseMasterWalletContext.mockReturnValue({
        masterEoa: makeMasterEoa(mixedCaseEoa),
        masterSafes: [mockMasterSafe],
        isLoading: false,
      });
      render(<Settings />);
      const addressLink = screen.getByTestId('address-link');
      expect(addressLink).toHaveAttribute(
        'data-address',
        BACKUP_SIGNER_ADDRESS,
      );
    });

    it('results in empty backup addresses when owners only contains masterEoa', () => {
      setupDefaults({
        owners: [DEFAULT_EOA_ADDRESS],
        ownersIsFetched: true,
      });
      render(<Settings />);
      expect(screen.getByText('No backup wallet added.')).toBeInTheDocument();
    });

    it('results in empty backup addresses when owners is empty', () => {
      setupDefaults({
        owners: [],
        ownersIsFetched: true,
      });
      render(<Settings />);
      expect(screen.getByText('No backup wallet added.')).toBeInTheDocument();
    });
  });

  describe('YourFundsAtRiskAlert', () => {
    it('is shown when ownersIsFetched and no backup address', () => {
      setupDefaults({
        owners: [DEFAULT_EOA_ADDRESS],
        ownersIsFetched: true,
      });
      render(<Settings />);
      expect(screen.getByTestId('funds-at-risk-alert')).toBeInTheDocument();
    });

    it('is not shown when a backup address exists', () => {
      setupDefaults({
        owners: [DEFAULT_EOA_ADDRESS, BACKUP_SIGNER_ADDRESS],
        ownersIsFetched: true,
      });
      render(<Settings />);
      expect(
        screen.queryByTestId('funds-at-risk-alert'),
      ).not.toBeInTheDocument();
    });

    it('is not shown when owners are not yet fetched', () => {
      setupDefaults({
        ownersIsFetched: false,
        owners: undefined,
      });
      render(<Settings />);
      expect(
        screen.queryByTestId('funds-at-risk-alert'),
      ).not.toBeInTheDocument();
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
    it('exports Main as the only screen', () => {
      expect(SettingsScreenMap).toEqual({ Main: 'Main' });
    });
  });
});
