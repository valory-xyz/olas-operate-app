import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { SetupBackupSigner } from '../../../../../components/SetupPage/Create/SetupBackupSigner';
import { SETUP_SCREEN } from '../../../../../constants/setupScreen';

jest.mock('../../../../../constants/providers', () => ({}));

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGoto = jest.fn();
const mockApplyBackupDuringSetup = jest.fn();
const mockError = jest.fn();

// Expose the onFinish each child was rendered with so tests can invoke it.
const capturedProps: {
  web3AuthOnFinish?: (address: string) => Promise<void> | void;
  manualOnFinish?: (address: string) => Promise<void> | void;
  setUpManually?: () => void;
} = {};

jest.mock('../../../../../hooks', () => ({
  useSetup: () => ({ goto: mockGoto }),
  useApplyBackupDuringSetup: () => mockApplyBackupDuringSetup,
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
    }) => {
      capturedProps.manualOnFinish = props.onFinish;
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
  });
});
