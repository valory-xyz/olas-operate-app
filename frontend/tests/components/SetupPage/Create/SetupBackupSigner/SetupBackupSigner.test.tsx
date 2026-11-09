import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { SetupBackupSigner } from '../../../../../components/SetupPage/Create/SetupBackupSigner';
import { SETUP_SCREEN } from '../../../../../constants/setupScreen';
import { BackupWalletError } from '../../../../../service/BackupWalletService';

jest.mock('../../../../../constants/providers', () => ({ PROVIDERS: {} }));

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGoto = jest.fn();
const mockSetPassword = jest.fn();
const mockSetIsReplacingBackup = jest.fn();
const mockLogEvent = jest.fn();
let mockIsReplacingBackup = false;
const mockApplyBackupDuringSetup = jest.fn();
const mockError = jest.fn();
let mockIsWeb3AuthEnabled = true;
let mockIsWeb3AuthStatusLoading = false;
const mockUseLatchedWeb3AuthEnabled = jest.fn<
  boolean | undefined,
  [string | null]
>(() => (mockIsWeb3AuthStatusLoading ? undefined : mockIsWeb3AuthEnabled));

// Expose the onFinish each child was rendered with so tests can invoke it.
const capturedProps: {
  web3AuthOnFinish?: (address: string) => Promise<void> | void;
  manualOnFinish?: (address: string) => Promise<void> | void;
  manualIsWeb3AuthEnabled?: boolean;
  setUpManually?: () => void;
} = {};

jest.mock('../../../../../hooks', () => ({
  useSetup: () => ({
    goto: mockGoto,
    setPassword: mockSetPassword,
    isReplacingBackup: mockIsReplacingBackup,
    setIsReplacingBackup: mockSetIsReplacingBackup,
  }),
  useElectronApi: () => ({ logEvent: mockLogEvent }),
  useApplyBackupDuringSetup: () => mockApplyBackupDuringSetup,
  useLatchedWeb3AuthEnabled: (key: string | null) =>
    mockUseLatchedWeb3AuthEnabled(key),
}));

jest.mock('../../../../../context/MessageProvider', () => ({
  useMessageApi: () => ({ error: mockError }),
}));

jest.mock(
  '../../../../../components/SetupPage/Create/SetupBackupSigner/BackupWalletWeb3Auth',
  () => ({
    BackupWalletWeb3Auth: (props: {
      onFinish: (address: string) => Promise<void> | void;
      onSetUpManuallyClick: () => void;
    }) => {
      capturedProps.web3AuthOnFinish = props.onFinish;
      capturedProps.setUpManually = props.onSetUpManuallyClick;
      return (
        <div data-testid="web3auth">
          <button
            data-testid="web3auth-finish"
            onClick={() =>
              props.onFinish('0xAa72b201fc49e0837648d5c8a89fCeD3eAb1364f')
            }
          >
            finish
          </button>
          <button
            data-testid="switch-manual"
            onClick={props.onSetUpManuallyClick}
          >
            manual
          </button>
        </div>
      );
    },
  }),
);

jest.mock(
  '../../../../../components/SetupPage/Create/SetupBackupSigner/BackupWalletManual',
  () => ({
    BackupWalletManual: (props: {
      onFinish: (address: string) => Promise<void> | void;
      isWeb3AuthEnabled: boolean;
    }) => {
      capturedProps.manualOnFinish = props.onFinish;
      capturedProps.manualIsWeb3AuthEnabled = props.isWeb3AuthEnabled;
      return (
        <div data-testid="manual">
          <button
            data-testid="manual-finish"
            onClick={() =>
              props.onFinish('0xAa72b201fc49e0837648d5c8a89fCeD3eAb1364f')
            }
          >
            finish
          </button>
        </div>
      );
    },
  }),
);

jest.mock(
  '../../../../../components/SetupPage/Create/SetupCreateHeader',
  () => ({
    SetupCreateHeader: () => <div />,
  }),
);

jest.mock('../../../../../components/ui', () => ({
  CardFlex: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SetupBackupSigner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedProps.web3AuthOnFinish = undefined;
    capturedProps.manualOnFinish = undefined;
    mockIsWeb3AuthEnabled = true;
    mockIsWeb3AuthStatusLoading = false;
    mockIsReplacingBackup = false;
  });

  it('shows neither view while the Web3Auth status loads, so a typed address is never swapped out', () => {
    mockIsWeb3AuthEnabled = false;
    mockIsWeb3AuthStatusLoading = true;
    const { container } = render(<SetupBackupSigner />);
    expect(container.querySelector('.ant-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('manual')).not.toBeInTheDocument();
    expect(screen.queryByTestId('web3auth')).not.toBeInTheDocument();
  });

  it('decides Web3Auth once for this step (its own latch key)', () => {
    render(<SetupBackupSigner />);
    expect(mockUseLatchedWeb3AuthEnabled).toHaveBeenCalledWith(
      SETUP_SCREEN.SetupBackupSigner,
    );
    expect(mockUseLatchedWeb3AuthEnabled).not.toHaveBeenCalledWith(null);
  });

  it('renders Web3Auth path by default', () => {
    render(<SetupBackupSigner />);
    expect(screen.getByTestId('web3auth')).toBeInTheDocument();
    expect(screen.queryByTestId('manual')).not.toBeInTheDocument();
  });

  it('switches to manual when user clicks "Provide Existing Backup Wallet"', () => {
    render(<SetupBackupSigner />);
    fireEvent.click(screen.getByTestId('switch-manual'));
    expect(screen.getByTestId('manual')).toBeInTheDocument();
    // The latched decision reaches the address screen, so its Google/Apple link shows.
    expect(capturedProps.manualIsWeb3AuthEnabled).toBe(true);
  });

  it('on Web3Auth finish: calls applyBackupDuringSetup then navigates to AgentOnboarding', async () => {
    mockApplyBackupDuringSetup.mockResolvedValueOnce(undefined);
    render(<SetupBackupSigner />);

    fireEvent.click(screen.getByTestId('web3auth-finish'));

    await waitFor(() =>
      expect(mockApplyBackupDuringSetup).toHaveBeenCalledWith(
        '0xAa72b201fc49e0837648d5c8a89fCeD3eAb1364f',
      ),
    );
    await waitFor(() =>
      expect(mockGoto).toHaveBeenCalledWith(SETUP_SCREEN.AgentOnboarding),
    );
    expect(mockError).not.toHaveBeenCalled();
  });

  it('on manual finish: calls applyBackupDuringSetup then navigates to AgentOnboarding', async () => {
    mockApplyBackupDuringSetup.mockResolvedValueOnce(undefined);
    render(<SetupBackupSigner />);

    fireEvent.click(screen.getByTestId('switch-manual'));
    fireEvent.click(screen.getByTestId('manual-finish'));

    await waitFor(() =>
      expect(mockApplyBackupDuringSetup).toHaveBeenCalledWith(
        '0xAa72b201fc49e0837648d5c8a89fCeD3eAb1364f',
      ),
    );
    await waitFor(() =>
      expect(mockGoto).toHaveBeenCalledWith(SETUP_SCREEN.AgentOnboarding),
    );
  });

  it('on apply failure: shows error message and still navigates (non-blocking)', async () => {
    mockApplyBackupDuringSetup.mockRejectedValueOnce(new Error('boom'));
    render(<SetupBackupSigner />);

    fireEvent.click(screen.getByTestId('web3auth-finish'));

    await waitFor(() => expect(mockError).toHaveBeenCalledWith('boom'));
    await waitFor(() =>
      expect(mockGoto).toHaveBeenCalledWith(SETUP_SCREEN.AgentOnboarding),
    );
    // Nothing will retry it, so the password isn't kept; the failure is logged.
    expect(mockSetPassword).toHaveBeenCalledWith(null);
    expect(mockLogEvent).toHaveBeenCalledWith(
      'Backup wallet apply during setup failed (UNKNOWN): boom',
    );
  });

  describe('when replacing an ignored Google/Apple pick', () => {
    beforeEach(() => {
      mockIsWeb3AuthEnabled = false;
      mockIsReplacingBackup = true;
    });

    it('stays on the step, keeping the password, when the apply fails, and logs the code', async () => {
      mockApplyBackupDuringSetup.mockRejectedValueOnce(
        new BackupWalletError('Network error', 'NETWORK_ERROR'),
      );
      render(<SetupBackupSigner />);

      fireEvent.click(screen.getByTestId('manual-finish'));

      await waitFor(() =>
        expect(mockError).toHaveBeenCalledWith('Network error'),
      );
      expect(mockLogEvent).toHaveBeenCalledWith(
        'Backup wallet apply during setup failed (NETWORK_ERROR): Network error',
      );
      // Canonical still holds the old backup: the user must be able to retry.
      expect(mockGoto).not.toHaveBeenCalled();
      expect(mockSetPassword).not.toHaveBeenCalled();
      expect(mockSetIsReplacingBackup).not.toHaveBeenCalled();
    });

    it('moves on once the apply succeeds', async () => {
      mockApplyBackupDuringSetup.mockResolvedValueOnce(undefined);
      render(<SetupBackupSigner />);

      fireEvent.click(screen.getByTestId('manual-finish'));

      await waitFor(() =>
        expect(mockGoto).toHaveBeenCalledWith(SETUP_SCREEN.AgentOnboarding),
      );
      expect(mockSetIsReplacingBackup).toHaveBeenCalledWith(false);
    });
  });

  describe('when Web3Auth is disabled', () => {
    beforeEach(() => {
      mockIsWeb3AuthEnabled = false;
    });

    it('shows address entry directly and no Google/Apple option', () => {
      render(<SetupBackupSigner />);
      expect(screen.getByTestId('manual')).toBeInTheDocument();
      expect(screen.queryByTestId('web3auth')).not.toBeInTheDocument();
      expect(capturedProps.manualIsWeb3AuthEnabled).toBe(false);
    });

    it('on manual finish: applies the backup and navigates to AgentOnboarding', async () => {
      mockApplyBackupDuringSetup.mockResolvedValueOnce(undefined);
      render(<SetupBackupSigner />);

      fireEvent.click(screen.getByTestId('manual-finish'));

      await waitFor(() =>
        expect(mockApplyBackupDuringSetup).toHaveBeenCalledWith(
          '0xAa72b201fc49e0837648d5c8a89fCeD3eAb1364f',
        ),
      );
      await waitFor(() =>
        expect(mockGoto).toHaveBeenCalledWith(SETUP_SCREEN.AgentOnboarding),
      );
    });
  });
});
