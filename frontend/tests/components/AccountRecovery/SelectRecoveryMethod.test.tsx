import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';

import { SETUP_SCREEN } from '../../../constants';
import { RECOVERY_STEPS } from '../../../components/AccountRecovery/constants';

const mockGoto = jest.fn();
const mockSetCurrentStep = jest.fn();

jest.mock('../../../hooks', () => ({
  useSetup: () => ({ goto: mockGoto }),
}));

jest.mock('../../../components/AccountRecovery/AccountRecoveryProvider', () => ({
  AccountRecoveryProvider: ({ children }: { children: React.ReactNode }) =>
    children,
  useAccountRecoveryContext: () => ({
    isLoading: false,
    isRecoveryAvailable: true,
    currentStep: RECOVERY_STEPS.SelectRecoveryMethod,
    setCurrentStep: mockSetCurrentStep,
  }),
}));

jest.mock('../../../components/AccountRecovery/components/RecoveryViaBackupWallet', () => ({
  ForgotPasswordCard: ({ isRecoveryAvailable }: { isRecoveryAvailable: boolean }) => (
    <div data-testid="forgot-password-card" data-recovery={String(isRecoveryAvailable)}>
      Forgot Password
    </div>
  ),
}));

jest.mock('../../../components/AccountRecovery/components/RecoverExistingAccountCard', () => ({
  RecoverExistingAccountCard: () => (
    <div data-testid="recover-existing-card">Recover Existing Account</div>
  ),
}));

jest.mock('../../../components/ui', () => ({
  BackButton: ({ onPrev }: { onPrev: () => void }) => (
    <button data-testid="back-btn" onClick={onPrev}>
      Back
    </button>
  ),
}));

import { AccountRecovery } from '../../../components/AccountRecovery';

describe('SelectRecoveryMethod', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it('passes isRecoveryAvailable to ForgotPasswordCard', () => {
    render(<AccountRecovery />);
    expect(screen.getByTestId('forgot-password-card')).toHaveAttribute(
      'data-recovery',
      'true',
    );
  });

  it('navigates to Welcome screen when Back is clicked', () => {
    render(<AccountRecovery />);
    fireEvent.click(screen.getByTestId('back-btn'));
    expect(mockGoto).toHaveBeenCalledWith(SETUP_SCREEN.Welcome);
  });
});
