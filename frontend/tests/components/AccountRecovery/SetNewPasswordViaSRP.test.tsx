import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { SetNewPasswordViaSRP } from '../../../components/AccountRecovery/components/SetNewPasswordViaSRP';
import { ERROR_CODE } from '../../../constants/errors';
import { createQueryClientWrapper } from '../../helpers/queryClient';

const mockOnNext = jest.fn();
const mockOnPrev = jest.fn();
const mockSetSrpError = jest.fn();
const mockGotoPage = jest.fn();
const mockMessageError = jest.fn();
const mockResetAccountWithMnemonic = jest.fn();

let mockIsUserLoggedIn = false;

jest.mock(
  '../../../components/AccountRecovery/AccountRecoveryProvider',
  () => ({
    useAccountRecoveryContext: () => ({
      srpMnemonic:
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
      setSrpError: mockSetSrpError,
      onNext: mockOnNext,
      onPrev: mockOnPrev,
    }),
  }),
);

jest.mock('../../../hooks', () => ({
  usePageState: () => ({
    isUserLoggedIn: mockIsUserLoggedIn,
    goto: mockGotoPage,
  }),
}));

jest.mock('../../../context/MessageProvider', () => ({
  useMessageApi: () => ({ error: mockMessageError }),
}));

jest.mock('../../../service/Account', () => ({
  AccountService: {
    resetAccountWithMnemonic: (...args: unknown[]) =>
      mockResetAccountWithMnemonic(...args),
  },
}));

jest.mock('../../../components/ui', () => ({
  Alert: ({
    message,
    type,
  }: {
    message: React.ReactNode;
    type: string;
    showIcon?: boolean;
  }) => (
    <div data-testid={`alert-${type}`} role="alert">
      {message}
    </div>
  ),
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
  FormLabel: ({ children }: { children: React.ReactNode }) => (
    <label>{children}</label>
  ),
  RequiredMark: undefined,
}));

jest.mock('../../../components/ui/forms', () => ({
  PasswordStrength: ({ score }: { score: number }) => (
    <div data-testid="password-strength">Score: {score}</div>
  ),
}));

const renderComponent = () =>
  render(<SetNewPasswordViaSRP />, {
    wrapper: createQueryClientWrapper(),
  });

describe('SetNewPasswordViaSRP', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsUserLoggedIn = false;
    mockResetAccountWithMnemonic.mockResolvedValue({});
  });

  it('renders the title and info alert', () => {
    renderComponent();
    expect(screen.getByText('Set New Password')).toBeInTheDocument();
    expect(screen.getByTestId('alert-info')).toBeInTheDocument();
  });

  it('renders new password and confirm password fields', () => {
    renderComponent();
    expect(screen.getByLabelText('New password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm new password')).toBeInTheDocument();
  });

  it('disables submit button when form is empty', () => {
    renderComponent();
    const button = screen.getByRole('button', { name: 'Reset Password' });
    expect(button).toBeDisabled();
  });

  it('enables submit button when passwords match and are valid', async () => {
    renderComponent();

    fireEvent.change(screen.getByLabelText('New password'), {
      target: { value: 'ValidPass1!' },
    });
    fireEvent.change(screen.getByLabelText('Confirm new password'), {
      target: { value: 'ValidPass1!' },
    });

    await waitFor(() => {
      const button = screen.getByRole('button', { name: 'Reset Password' });
      expect(button).not.toBeDisabled();
    });
  });

  it('shows "Passwords match" when both fields match', async () => {
    renderComponent();

    fireEvent.change(screen.getByLabelText('New password'), {
      target: { value: 'ValidPass1!' },
    });
    fireEvent.change(screen.getByLabelText('Confirm new password'), {
      target: { value: 'ValidPass1!' },
    });

    await waitFor(() => {
      expect(screen.getByText('Passwords match')).toBeInTheDocument();
    });
  });

  it('shows "Passwords don\'t match" when fields differ', async () => {
    renderComponent();

    fireEvent.change(screen.getByLabelText('New password'), {
      target: { value: 'ValidPass1!' },
    });
    fireEvent.change(screen.getByLabelText('Confirm new password'), {
      target: { value: 'DifferentPass2!' },
    });

    await waitFor(() => {
      expect(screen.getByText("Passwords don't match")).toBeInTheDocument();
    });
  });

  it('calls onPrev when Back button is clicked', () => {
    renderComponent();
    fireEvent.click(screen.getByTestId('back-btn'));
    expect(mockOnPrev).toHaveBeenCalled();
  });

  it('calls resetAccountWithMnemonic and onNext on success (not logged in)', async () => {
    mockIsUserLoggedIn = false;
    renderComponent();

    fireEvent.change(screen.getByLabelText('New password'), {
      target: { value: 'ValidPass1!' },
    });
    fireEvent.change(screen.getByLabelText('Confirm new password'), {
      target: { value: 'ValidPass1!' },
    });

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Reset Password' }),
      ).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }));

    await waitFor(() => {
      expect(mockResetAccountWithMnemonic).toHaveBeenCalledWith(
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
        'ValidPass1!',
      );
      expect(mockOnNext).toHaveBeenCalled();
      expect(mockGotoPage).not.toHaveBeenCalled();
    });
  });

  it('calls gotoPage(Main) on success when user is logged in', async () => {
    mockIsUserLoggedIn = true;
    renderComponent();

    fireEvent.change(screen.getByLabelText('New password'), {
      target: { value: 'ValidPass1!' },
    });
    fireEvent.change(screen.getByLabelText('Confirm new password'), {
      target: { value: 'ValidPass1!' },
    });

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Reset Password' }),
      ).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }));

    await waitFor(() => {
      expect(mockGotoPage).toHaveBeenCalledWith('Main');
      expect(mockOnNext).not.toHaveBeenCalled();
    });
  });

  it('sets srpError and calls onPrev on MSG_INVALID_MNEMONIC error', async () => {
    mockResetAccountWithMnemonic.mockRejectedValue(
      new Error(ERROR_CODE.MSG_INVALID_MNEMONIC),
    );
    renderComponent();

    fireEvent.change(screen.getByLabelText('New password'), {
      target: { value: 'ValidPass1!' },
    });
    fireEvent.change(screen.getByLabelText('Confirm new password'), {
      target: { value: 'ValidPass1!' },
    });

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Reset Password' }),
      ).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }));

    await waitFor(() => {
      expect(mockSetSrpError).toHaveBeenCalledWith(
        'Please review your input and try again.',
      );
      expect(mockOnPrev).toHaveBeenCalled();
    });
  });

  it('shows error message via messageApi for other errors', async () => {
    mockResetAccountWithMnemonic.mockRejectedValue(
      new Error('Network failure'),
    );
    renderComponent();

    fireEvent.change(screen.getByLabelText('New password'), {
      target: { value: 'ValidPass1!' },
    });
    fireEvent.change(screen.getByLabelText('Confirm new password'), {
      target: { value: 'ValidPass1!' },
    });

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Reset Password' }),
      ).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }));

    await waitFor(() => {
      expect(mockMessageError).toHaveBeenCalledWith('Network failure');
      expect(mockSetSrpError).not.toHaveBeenCalled();
      expect(mockOnPrev).not.toHaveBeenCalled();
    });
  });
});
