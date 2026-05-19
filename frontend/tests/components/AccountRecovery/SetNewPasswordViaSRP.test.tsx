import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { SetNewPasswordViaSRP } from '../../../components/AccountRecovery/components/SetNewPasswordViaSRP';
import { SETUP_SCREEN } from '../../../constants';
import { ERROR_CODE } from '../../../constants/errors';

const mockOnPrev = jest.fn();
const mockSetSrpMnemonic = jest.fn();
const mockSetSrpError = jest.fn();
const mockGotoPage = jest.fn();
const mockGotoSetup = jest.fn();
const mockToggleSupportModal = jest.fn();
const mockResetAccountWithMnemonic = jest.fn();

let mockIsUserLoggedIn = false;

jest.mock(
  '../../../components/AccountRecovery/AccountRecoveryProvider',
  () => ({
    useAccountRecoveryContext: () => ({
      srpMnemonic:
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
      setSrpMnemonic: mockSetSrpMnemonic,
      setSrpError: mockSetSrpError,
      onPrev: mockOnPrev,
    }),
  }),
);

jest.mock('../../../hooks', () => ({
  usePageState: () => ({
    isUserLoggedIn: mockIsUserLoggedIn,
    goto: mockGotoPage,
  }),
  useSetup: () => ({ goto: mockGotoSetup }),
}));

jest.mock('../../../context/SupportModalProvider', () => ({
  useSupportModal: () => ({ toggleSupportModal: mockToggleSupportModal }),
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
  Modal: ({
    title,
    description,
    action,
  }: {
    title?: string;
    description?: React.ReactNode;
    action?: React.ReactNode;
  }) => (
    <div role="dialog">
      {title && <h3>{title}</h3>}
      <div>{description}</div>
      {action}
    </div>
  ),
  RequiredMark: undefined,
}));

jest.mock('../../../components/ui/forms', () => {
  const actual = jest.requireActual('../../../components/ui/forms');
  return {
    ...actual,
    PasswordStrength: ({ score }: { score: number }) => (
      <div data-testid="password-strength">Score: {score}</div>
    ),
  };
});

const renderComponent = () => render(<SetNewPasswordViaSRP />);

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
    const button = screen.getByRole('button', { name: 'Confirm Password' });
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
      const button = screen.getByRole('button', { name: 'Confirm Password' });
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

  it('clears the mnemonic and calls onPrev when Back is clicked', () => {
    renderComponent();
    fireEvent.click(screen.getByTestId('back-btn'));
    expect(mockSetSrpMnemonic).toHaveBeenCalledWith(undefined);
    expect(mockOnPrev).toHaveBeenCalled();
  });

  it('shows success modal on resetAccountWithMnemonic success', async () => {
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
        screen.getByRole('button', { name: 'Confirm Password' }),
      ).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Password' }));

    await waitFor(() => {
      expect(mockResetAccountWithMnemonic).toHaveBeenCalledWith(
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
        'ValidPass1!',
      );
      expect(
        screen.getByText('New Password Set Successfully!'),
      ).toBeInTheDocument();
    });
    // Navigation does not happen until the user clicks "Done"
    expect(mockGotoSetup).not.toHaveBeenCalled();
    expect(mockGotoPage).not.toHaveBeenCalled();
  });

  it('Done on success modal navigates to Welcome (not logged in)', async () => {
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
        screen.getByRole('button', { name: 'Confirm Password' }),
      ).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Password' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(mockGotoSetup).toHaveBeenCalledWith(SETUP_SCREEN.Welcome);
    expect(mockGotoPage).not.toHaveBeenCalled();
    expect(mockSetSrpMnemonic).toHaveBeenCalledWith(undefined);
    expect(mockSetSrpError).toHaveBeenCalledWith(undefined);
  });

  it('Done on success modal navigates to Main when user is logged in', async () => {
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
        screen.getByRole('button', { name: 'Confirm Password' }),
      ).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Password' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(mockGotoPage).toHaveBeenCalledWith('Main');
    expect(mockGotoSetup).not.toHaveBeenCalled();
  });

  it('renders a Cancel button that exits the flow (not logged in → Welcome)', () => {
    mockIsUserLoggedIn = false;
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockGotoSetup).toHaveBeenCalledWith(SETUP_SCREEN.Welcome);
    expect(mockSetSrpMnemonic).toHaveBeenCalledWith(undefined);
    expect(mockSetSrpError).toHaveBeenCalledWith(undefined);
  });

  it('Cancel button routes logged-in users back to Main', () => {
    mockIsUserLoggedIn = true;
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockGotoPage).toHaveBeenCalledWith('Main');
  });

  it('sets srpError and calls onPrev when backend rejects the mnemonic', async () => {
    mockResetAccountWithMnemonic.mockRejectedValue(
      new Error(
        `Failed to update password: ${ERROR_CODE.MSG_INVALID_MNEMONIC}`,
      ),
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
        screen.getByRole('button', { name: 'Confirm Password' }),
      ).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Password' }));

    await waitFor(() => {
      expect(mockSetSrpError).toHaveBeenCalledWith(
        'Please review your input and try again.',
      );
      expect(mockOnPrev).toHaveBeenCalled();
    });
  });

  it('shows error modal on non-MSG_INVALID_MNEMONIC failure', async () => {
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
        screen.getByRole('button', { name: 'Confirm Password' }),
      ).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Password' }));

    await waitFor(() => {
      expect(screen.getByText('Password Update Failed')).toBeInTheDocument();
    });
    expect(mockSetSrpError).not.toHaveBeenCalled();
    expect(mockOnPrev).not.toHaveBeenCalled();
  });

  it('Try Again on error modal closes the modal and keeps the form', async () => {
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
        screen.getByRole('button', { name: 'Confirm Password' }),
      ).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Password' }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Try Again' }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
    expect(
      screen.queryByText('Password Update Failed'),
    ).not.toBeInTheDocument();
    expect(mockToggleSupportModal).not.toHaveBeenCalled();
  });

  it('Contact Support on error modal opens the support modal', async () => {
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
        screen.getByRole('button', { name: 'Confirm Password' }),
      ).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Password' }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Contact Support' }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Contact Support' }));
    expect(mockToggleSupportModal).toHaveBeenCalled();
  });
});
