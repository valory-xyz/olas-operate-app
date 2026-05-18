import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';

import { UpdatePasswordScreen } from '../../../../components/SettingsPage/UpdatePassword';
import { PAGES, SETUP_SCREEN } from '../../../../constants';
import { ERROR_CODE } from '../../../../constants/errors';
import { SettingsScreenMap } from '../../../../constants/screen';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

const mockGoto = jest.fn();
const mockSetupGoto = jest.fn();
const mockPageGoto = jest.fn();
const mockSuccess = jest.fn();
const mockError = jest.fn();

jest.mock('../../../../hooks', () => ({
  useSettings: () => ({
    screen: SettingsScreenMap.UpdatePassword,
    goto: mockGoto,
  }),
  useSetup: () => ({ goto: mockSetupGoto }),
  usePageState: () => ({ goto: mockPageGoto }),
}));

jest.mock('../../../../context/MessageProvider', () => ({
  useMessageApi: () => ({ success: mockSuccess, error: mockError }),
}));

jest.mock('../../../../service/Account', () => ({
  AccountService: {
    updateAccount: jest.fn(),
  },
}));

jest.mock('../../../../components/ui', () => ({
  Alert: (props: { type: string; message: string; showIcon?: boolean }) => (
    <div data-testid="alert" data-type={props.type}>
      {props.message}
    </div>
  ),
  BackButton: (props: { onPrev: () => void }) => (
    <button data-testid="back-button" onClick={props.onPrev}>
      Back
    </button>
  ),
  CardFlex: (props: { children?: React.ReactNode }) => (
    <div>{props.children}</div>
  ),
  cardStyles: {},
  FormLabel: (props: { children?: React.ReactNode }) => (
    <label>{props.children}</label>
  ),
  RequiredMark: (label: React.ReactNode) => label,
}));

jest.mock('../../../../components/ui/forms', () => {
  const actual = jest.requireActual('../../../../components/ui/forms');
  return {
    ...actual,
    PasswordStrength: (props: { score: number }) => (
      <div data-testid="password-strength" data-score={props.score} />
    ),
  };
});

jest.mock('zxcvbn', () => ({
  __esModule: true,
  default: (password: string) => ({
    score: Math.min(password.length > 12 ? 4 : password.length > 8 ? 2 : 1, 4),
  }),
}));

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'styled-components',
  () => require('../../../mocks/styledComponents').styledComponentsMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */

// ---------------------------------------------------------------------------
// Typed mock references
// ---------------------------------------------------------------------------

const { AccountService } = jest.requireMock('../../../../service/Account') as {
  AccountService: { updateAccount: jest.Mock };
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fillField = (label: string, value: string) => {
  const input = screen.getByLabelText(label);
  fireEvent.change(input, { target: { value } });
};

const getSubmitButton = () =>
  screen.getByRole('button', { name: 'Update Password' });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('UpdatePasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AccountService.updateAccount.mockResolvedValue({});
  });

  it('renders the form with title, description, and info alert', () => {
    render(<UpdatePasswordScreen />);
    expect(screen.getByText('Set New Password')).toBeInTheDocument();
    expect(
      screen.getByText('Change the password you use to unlock Pearl.'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('alert')).toHaveAttribute('data-type', 'info');
  });

  describe('CTA disabled states', () => {
    it('disables CTA when all fields are empty', () => {
      render(<UpdatePasswordScreen />);
      expect(getSubmitButton()).toBeDisabled();
    });

    it('disables CTA when only current password is filled', async () => {
      render(<UpdatePasswordScreen />);
      await act(async () => {
        fillField('Current password', 'oldpassword');
      });
      expect(getSubmitButton()).toBeDisabled();
    });

    it('disables CTA when passwords do not match', async () => {
      render(<UpdatePasswordScreen />);
      await act(async () => {
        fillField('Current password', 'oldpassword');
        fillField('New password', 'newpassword123!');
        fillField('Confirm new password', 'differentpassword');
      });
      expect(getSubmitButton()).toBeDisabled();
    });

    it('enables CTA when all fields are filled and passwords match', async () => {
      render(<UpdatePasswordScreen />);
      await act(async () => {
        fillField('Current password', 'oldpassword');
        fillField('New password', 'newpassword123!');
        fillField('Confirm new password', 'newpassword123!');
      });
      expect(getSubmitButton()).not.toBeDisabled();
    });
  });

  describe('password match/mismatch captions', () => {
    it('shows "Passwords match" when passwords match', async () => {
      render(<UpdatePasswordScreen />);
      await act(async () => {
        fillField('New password', 'newpassword123!');
        fillField('Confirm new password', 'newpassword123!');
      });
      expect(screen.getByText('Passwords match')).toBeInTheDocument();
    });

    it('shows "Passwords don\'t match" when passwords mismatch', async () => {
      render(<UpdatePasswordScreen />);
      await act(async () => {
        fillField('New password', 'newpassword123!');
        fillField('Confirm new password', 'differentpass');
      });
      expect(screen.getByText("Passwords don't match")).toBeInTheDocument();
    });
  });

  describe('password strength indicator', () => {
    it('shows PasswordStrength when new password is valid', async () => {
      render(<UpdatePasswordScreen />);
      await act(async () => {
        fillField('New password', 'validpass');
      });
      expect(screen.getByText(/Password strength:/)).toBeInTheDocument();
    });
  });

  describe('form submission', () => {
    it('calls updateAccount and shows success toast on success', async () => {
      render(<UpdatePasswordScreen />);

      await act(async () => {
        fillField('Current password', 'oldpassword');
        fillField('New password', 'newpassword123!');
        fillField('Confirm new password', 'newpassword123!');
      });

      await act(async () => {
        fireEvent.click(getSubmitButton());
      });

      await waitFor(() => {
        expect(AccountService.updateAccount).toHaveBeenCalledWith(
          'oldpassword',
          'newpassword123!',
        );
        expect(mockSuccess).toHaveBeenCalledWith('Password has been updated');
        expect(mockGoto).toHaveBeenCalledWith(SettingsScreenMap.Main);
      });
    });

    it('shows field error when backend rejects the current password', async () => {
      AccountService.updateAccount.mockRejectedValue(
        new Error(
          `Failed to update password: ${ERROR_CODE.MSG_INVALID_PASSWORD}`,
        ),
      );

      render(<UpdatePasswordScreen />);

      await act(async () => {
        fillField('Current password', 'wrongpassword');
        fillField('New password', 'newpassword123!');
        fillField('Confirm new password', 'newpassword123!');
      });

      await act(async () => {
        fireEvent.click(getSubmitButton());
      });

      await waitFor(() => {
        expect(
          screen.getByText('Incorrect password. Please try again.'),
        ).toBeInTheDocument();
      });
    });

    it('shows error toast on other backend error', async () => {
      AccountService.updateAccount.mockRejectedValue(new Error('Server error'));

      render(<UpdatePasswordScreen />);

      await act(async () => {
        fillField('Current password', 'oldpassword');
        fillField('New password', 'newpassword123!');
        fillField('Confirm new password', 'newpassword123!');
      });

      await act(async () => {
        fireEvent.click(getSubmitButton());
      });

      await waitFor(() => {
        expect(mockError).toHaveBeenCalledWith('Server error');
      });
    });
  });

  describe('navigation', () => {
    it('navigates back to Settings main on back button click', () => {
      render(<UpdatePasswordScreen />);
      fireEvent.click(screen.getByTestId('back-button'));
      expect(mockGoto).toHaveBeenCalledWith(SettingsScreenMap.Main);
    });

    it('navigates to AccountRecovery on "Forgot your password?" click', () => {
      render(<UpdatePasswordScreen />);
      fireEvent.click(screen.getByText('Forgot your password?'));
      expect(mockSetupGoto).toHaveBeenCalledWith(SETUP_SCREEN.AccountRecovery);
      expect(mockPageGoto).toHaveBeenCalledWith(PAGES.Setup);
    });
  });
});
