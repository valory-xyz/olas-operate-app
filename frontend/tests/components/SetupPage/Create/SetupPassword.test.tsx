import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';

import { SetupPassword } from '../../../../components/SetupPage/Create/SetupPassword';
import { SETUP_SCREEN } from '../../../../constants';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

const mockGoto = jest.fn();
const mockSetPassword = jest.fn();
const mockSetUserLoggedIn = jest.fn();
const mockSetMnemonicExists = jest.fn();
const mockError = jest.fn();

jest.mock('../../../../hooks', () => ({
  useSetup: () => ({ goto: mockGoto, setPassword: mockSetPassword }),
  usePageState: () => ({ setUserLoggedIn: mockSetUserLoggedIn }),
  useMnemonicExists: () => ({ setMnemonicExists: mockSetMnemonicExists }),
}));

jest.mock('../../../../context/MessageProvider', () => ({
  useMessageApi: () => ({ error: mockError }),
}));

jest.mock('../../../../service/Account', () => ({
  AccountService: {
    createAccount: jest.fn(),
    loginAccount: jest.fn(),
  },
}));

jest.mock('../../../../service/Wallet', () => ({
  WalletService: {
    createEoa: jest.fn(),
  },
}));

jest.mock('../../../../components/ui', () => ({
  BackButton: (props: { onPrev: () => void }) => (
    <button data-testid="back-button" onClick={props.onPrev}>
      Back
    </button>
  ),
  CardFlex: (props: { children?: React.ReactNode }) => (
    <div>{props.children}</div>
  ),
  FormLabel: (props: { children?: React.ReactNode }) => (
    <label>{props.children}</label>
  ),
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
  AccountService: {
    createAccount: jest.Mock;
    loginAccount: jest.Mock;
  };
};

const { WalletService } = jest.requireMock('../../../../service/Wallet') as {
  WalletService: { createEoa: jest.Mock };
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fillField = (label: string, value: string) => {
  const input = screen.getByLabelText(label);
  fireEvent.change(input, { target: { value } });
};

const getSubmitButton = () => screen.getByRole('button', { name: 'Continue' });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SetupPassword', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AccountService.createAccount.mockResolvedValue({});
    AccountService.loginAccount.mockResolvedValue({});
    WalletService.createEoa.mockResolvedValue({});
  });

  it('renders "Set Password" title', () => {
    render(<SetupPassword />);
    expect(screen.getByText('Set Password')).toBeInTheDocument();
  });

  it('renders "Enter password" label', () => {
    render(<SetupPassword />);
    expect(screen.getByText('Enter password')).toBeInTheDocument();
  });

  it('renders "Confirm password" label', () => {
    render(<SetupPassword />);
    expect(screen.getByText('Confirm password')).toBeInTheDocument();
  });

  describe('CTA disabled states', () => {
    it('disables Continue when both fields are empty', () => {
      render(<SetupPassword />);
      expect(getSubmitButton()).toBeDisabled();
    });

    it('disables Continue when only password is entered', async () => {
      render(<SetupPassword />);
      await act(async () => {
        fillField('Enter password', 'validpass123!');
      });
      expect(getSubmitButton()).toBeDisabled();
    });

    it('disables Continue when passwords do not match', async () => {
      render(<SetupPassword />);
      await act(async () => {
        fillField('Enter password', 'validpass123!');
        fillField('Confirm password', 'differentpass');
      });
      expect(getSubmitButton()).toBeDisabled();
    });

    it('enables Continue when passwords match and are >= 8 chars', async () => {
      render(<SetupPassword />);
      await act(async () => {
        fillField('Enter password', 'validpass123!');
        fillField('Confirm password', 'validpass123!');
      });
      expect(getSubmitButton()).not.toBeDisabled();
    });
  });

  describe('new password captions', () => {
    it('shows the min-length caption while the password is too short', async () => {
      render(<SetupPassword />);
      await act(async () => {
        fillField('Enter password', 'short');
      });
      expect(
        screen.getByText('Password must be at least 8 characters.'),
      ).toBeInTheDocument();
      expect(screen.queryByText(/Password strength:/)).not.toBeInTheDocument();
    });

    it('shows the ASCII caption for non-ASCII input', async () => {
      render(<SetupPassword />);
      await act(async () => {
        fillField('Enter password', 'pässword123');
      });
      expect(
        screen.getByText('Password must only contain ASCII characters.'),
      ).toBeInTheDocument();
    });

    it('replaces the error caption with strength once valid', async () => {
      render(<SetupPassword />);
      await act(async () => {
        fillField('Enter password', 'short');
      });
      await act(async () => {
        fillField('Enter password', 'validpass123!');
      });
      expect(screen.getByText(/Password strength:/)).toBeInTheDocument();
      expect(
        screen.queryByText('Password must be at least 8 characters.'),
      ).not.toBeInTheDocument();
    });

    it('shows "Please input a password." when cleared after typing', async () => {
      render(<SetupPassword />);
      await act(async () => {
        fillField('Enter password', 'validpass123!');
      });
      await act(async () => {
        fillField('Enter password', '');
      });
      expect(screen.getByText('Please input a password.')).toBeInTheDocument();
    });
  });

  describe('password match/mismatch captions', () => {
    it('shows "Passwords match" when passwords match', async () => {
      render(<SetupPassword />);
      await act(async () => {
        fillField('Enter password', 'validpass123!');
        fillField('Confirm password', 'validpass123!');
      });
      expect(screen.getByText('Passwords match')).toBeInTheDocument();
    });

    it('shows "Passwords don\'t match" when passwords mismatch', async () => {
      render(<SetupPassword />);
      await act(async () => {
        fillField('Enter password', 'validpass123!');
        fillField('Confirm password', 'differentpass');
      });
      expect(screen.getByText("Passwords don't match")).toBeInTheDocument();
    });

    it('shows "Please confirm your password." when confirm is cleared after typing', async () => {
      render(<SetupPassword />);
      await act(async () => {
        fillField('Enter password', 'validpass123!');
        fillField('Confirm password', 'validpass123!');
      });
      await act(async () => {
        fillField('Confirm password', '');
      });
      expect(
        screen.getByText('Please confirm your password.'),
      ).toBeInTheDocument();
      expect(screen.queryByText('Passwords match')).not.toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    it('back button calls goto(SETUP_SCREEN.Welcome)', () => {
      render(<SetupPassword />);
      fireEvent.click(screen.getByTestId('back-button'));
      expect(mockGoto).toHaveBeenCalledWith(SETUP_SCREEN.Welcome);
    });
  });

  describe('form submission', () => {
    it('calls AccountService.createAccount with newPassword on submit', async () => {
      render(<SetupPassword />);

      await act(async () => {
        fillField('Enter password', 'validpass123!');
        fillField('Confirm password', 'validpass123!');
      });

      await act(async () => {
        fireEvent.click(getSubmitButton());
      });

      await waitFor(() => {
        expect(AccountService.createAccount).toHaveBeenCalledWith(
          'validpass123!',
        );
        expect(AccountService.loginAccount).toHaveBeenCalledWith(
          'validpass123!',
        );
        expect(WalletService.createEoa).toHaveBeenCalled();
        expect(mockSetMnemonicExists).toHaveBeenCalledWith(true);
        expect(mockSetUserLoggedIn).toHaveBeenCalled();
        expect(mockSetPassword).toHaveBeenCalledWith('validpass123!');
        expect(mockGoto).toHaveBeenCalledWith(SETUP_SCREEN.SetupBackupSigner);
      });
    });

    it('shows error toast on failure', async () => {
      AccountService.createAccount.mockRejectedValue(
        new Error('Account creation failed'),
      );

      render(<SetupPassword />);

      await act(async () => {
        fillField('Enter password', 'validpass123!');
        fillField('Confirm password', 'validpass123!');
      });

      await act(async () => {
        fireEvent.click(getSubmitButton());
      });

      await waitFor(() => {
        expect(mockError).toHaveBeenCalledWith('Account creation failed');
      });
    });
  });
});
