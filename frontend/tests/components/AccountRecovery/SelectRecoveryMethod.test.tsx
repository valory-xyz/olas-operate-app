import { fireEvent, render, screen } from '@testing-library/react';

import { AccountRecovery } from '../../../components/AccountRecovery';
import {
  RECOVERY_STEPS,
  RecoverySteps,
  RESET_METHOD,
  ResetMethod,
} from '../../../components/AccountRecovery/constants';
import { SETUP_SCREEN } from '../../../constants';

const mockGoto = jest.fn();
const mockSetCurrentStep = jest.fn();

let mockStatus: 'loading' | 'enabled' | 'disabled' = 'enabled';
jest.mock('../../../hooks', () => ({
  useSetup: () => ({ goto: mockGoto }),
  useWeb3AuthStatus: () => ({
    status: mockStatus,
    isWeb3AuthEnabled: mockStatus === 'enabled',
  }),
}));

// Default mock — overridden per test when needed via mockContextValue
const defaultContext: {
  isLoading: boolean;
  isRecoveryAvailable: boolean;
  currentStep: RecoverySteps;
  setCurrentStep: jest.Mock;
  selectedResetMethod: ResetMethod | undefined;
  setSelectedResetMethod: jest.Mock;
} = {
  isLoading: false,
  isRecoveryAvailable: true,
  currentStep: RECOVERY_STEPS.SelectRecoveryMethod,
  setCurrentStep: mockSetCurrentStep,
  selectedResetMethod: undefined,
  setSelectedResetMethod: jest.fn(),
};

let mockContextValue = { ...defaultContext };

jest.mock(
  '../../../components/AccountRecovery/AccountRecoveryProvider',
  () => ({
    AccountRecoveryProvider: ({ children }: { children: React.ReactNode }) =>
      children,
    useAccountRecoveryContext: () => mockContextValue,
  }),
);

jest.mock(
  '../../../components/AccountRecovery/components/RecoveryViaBackupWallet',
  () => ({
    ForgotPasswordCard: () => (
      <div data-testid="forgot-password-card">Forgot Password</div>
    ),
  }),
);

jest.mock(
  '../../../components/AccountRecovery/components/SelectPasswordResetOption',
  () => ({
    SelectPasswordResetOption: () => (
      <div data-testid="select-reset-option">Select Reset Option</div>
    ),
  }),
);

jest.mock(
  '../../../components/AccountRecovery/components/RecoverExistingAccountCard',
  () => ({
    RecoverExistingAccountCard: () => (
      <div data-testid="recover-existing-card">Recover Existing Account</div>
    ),
  }),
);

jest.mock(
  '../../../components/AccountRecovery/components/RecoveryNotAvailable',
  () => ({
    RecoveryNotAvailable: () => <div data-testid="recovery-not-available" />,
  }),
);

jest.mock(
  '../../../components/AccountRecovery/components/EnterSecretRecoveryPhrase',
  () => ({
    EnterSecretRecoveryPhrase: () => (
      <div data-testid="enter-srp">Enter SRP</div>
    ),
  }),
);

jest.mock(
  '../../../components/AccountRecovery/components/SetNewPasswordViaSRP',
  () => ({
    SetNewPasswordViaSRP: () => (
      <div data-testid="set-new-password-srp">Set New Password via SRP</div>
    ),
  }),
);

jest.mock('../../../components/ui', () => ({
  BackButton: ({ onPrev }: { onPrev: () => void }) => (
    <button data-testid="back-btn" onClick={onPrev}>
      Back
    </button>
  ),
  CardFlex: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <div {...props}>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  IconContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

describe('SelectRecoveryMethod', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockContextValue = { ...defaultContext };
    mockStatus = 'enabled';
  });

  it('renders the "Select Recovery Option" title', () => {
    render(<AccountRecovery />);
    expect(screen.getByText('Select Recovery Option')).toBeInTheDocument();
  });

  it('renders the ForgotPasswordCard', () => {
    render(<AccountRecovery />);
    expect(screen.getByTestId('forgot-password-card')).toBeInTheDocument();
  });

  it('renders the RecoverExistingAccountCard', () => {
    render(<AccountRecovery />);
    expect(screen.getByTestId('recover-existing-card')).toBeInTheDocument();
  });

  it('always renders the ForgotPasswordCard CTA', () => {
    render(<AccountRecovery />);
    expect(screen.getByTestId('forgot-password-card')).toBeInTheDocument();
  });

  it('navigates to Welcome screen when Back is clicked', () => {
    render(<AccountRecovery />);
    fireEvent.click(screen.getByTestId('back-btn'));
    expect(mockGoto).toHaveBeenCalledWith(SETUP_SCREEN.Welcome);
  });
});

describe('AccountRecovery guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockContextValue = { ...defaultContext };
    mockStatus = 'enabled';
  });

  it('shows RecoveryNotAvailable when recovery is not available and method is not SRP', () => {
    mockContextValue = {
      ...defaultContext,
      isRecoveryAvailable: false,
      currentStep: RECOVERY_STEPS.CreateNewPassword,
      selectedResetMethod: undefined,
    };

    render(<AccountRecovery />);
    expect(screen.getByTestId('recovery-not-available')).toBeInTheDocument();
  });

  it('shows RecoveryNotAvailable for backup-wallet method when recovery is not available', () => {
    mockContextValue = {
      ...defaultContext,
      isRecoveryAvailable: false,
      currentStep: RECOVERY_STEPS.CreateNewPassword,
      selectedResetMethod: RESET_METHOD.BackupWallet,
    };

    render(<AccountRecovery />);
    expect(screen.getByTestId('recovery-not-available')).toBeInTheDocument();
  });

  it('bypasses RecoveryNotAvailable guard for SRP method even when recovery is not available', () => {
    mockContextValue = {
      ...defaultContext,
      isRecoveryAvailable: false,
      currentStep: RECOVERY_STEPS.EnterSecretRecoveryPhrase,
      selectedResetMethod: RESET_METHOD.SRP,
    };

    render(<AccountRecovery />);
    expect(
      screen.queryByTestId('recovery-not-available'),
    ).not.toBeInTheDocument();
  });

  it('always shows SelectRecoveryMethod at the first step regardless of recovery availability', () => {
    mockContextValue = {
      ...defaultContext,
      isRecoveryAvailable: false,
      currentStep: RECOVERY_STEPS.SelectRecoveryMethod,
    };

    render(<AccountRecovery />);
    expect(screen.getByText('Select Recovery Option')).toBeInTheDocument();
    expect(
      screen.queryByTestId('recovery-not-available'),
    ).not.toBeInTheDocument();
  });

  it('always shows SelectPasswordResetOption regardless of recovery availability', () => {
    mockContextValue = {
      ...defaultContext,
      isRecoveryAvailable: false,
      currentStep: RECOVERY_STEPS.SelectPasswordResetOption,
    };

    render(<AccountRecovery />);
    expect(
      screen.getByText('Select Password Reset Option'),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('recovery-not-available'),
    ).not.toBeInTheDocument();
  });

  it('mentions the backup wallet in the reset subtitle when Web3Auth is enabled, even with no backup to recover with', () => {
    mockStatus = 'enabled';
    mockContextValue = {
      ...defaultContext,
      isRecoveryAvailable: false,
      currentStep: RECOVERY_STEPS.SelectPasswordResetOption,
    };

    render(<AccountRecovery />);
    expect(
      screen.getByText(
        'You can restore access to your account via the seed phrase or the backup wallet.',
      ),
    ).toBeInTheDocument();
  });

  it('drops the backup wallet from the reset subtitle when Web3Auth is disabled', () => {
    mockStatus = 'disabled';
    mockContextValue = {
      ...defaultContext,
      currentStep: RECOVERY_STEPS.SelectPasswordResetOption,
    };

    render(<AccountRecovery />);
    expect(
      screen.getByText(
        'You can restore access to your account via the seed phrase.',
      ),
    ).toBeInTheDocument();
  });

  it('shows the recovery-phrase subtitle while the status loads (e.g. offline)', () => {
    mockStatus = 'loading';
    mockContextValue = {
      ...defaultContext,
      currentStep: RECOVERY_STEPS.SelectPasswordResetOption,
    };

    render(<AccountRecovery />);
    expect(
      screen.getByText(
        'You can restore access to your account via the seed phrase.',
      ),
    ).toBeInTheDocument();
  });
});
