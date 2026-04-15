import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { AccountService } from '../../../service/Account';
import { WalletService } from '../../../service/Wallet';

// ---------------------------------------------------------------------------
// Module mocks — must come before the component import
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'styled-components',
  () => require('../../mocks/styledComponents').styledComponentsMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */

jest.mock('../../../constants/providers', () => ({}));
jest.mock('../../../config/providers', () => ({ providers: [] }));

// Stub antd so no ESM imports are triggered
jest.mock('antd', () => {
  const React = require('react');

  const Button = React.forwardRef(
    (
      {
        children,
        htmlType,
        loading,
        onClick,
        disabled,
      }: {
        children?: React.ReactNode;
        htmlType?: string;
        loading?: boolean;
        onClick?: () => void;
        disabled?: boolean;
      },
      ref: React.Ref<HTMLButtonElement>,
    ) =>
      React.createElement(
        'button',
        {
          ref,
          type: htmlType || 'button',
          onClick,
          disabled: loading || disabled,
          'aria-busy': loading,
        },
        loading ? 'Loading...' : children,
      ),
  );
  Button.displayName = 'Button';

  const Input = {
    Password: React.forwardRef(
      (
        props: { size?: string; onChange?: (e: unknown) => void },
        ref: React.Ref<HTMLInputElement>,
      ) =>
        React.createElement('input', {
          ref,
          type: 'password',
          role: 'textbox',
          onChange: props.onChange,
        }),
    ),
  };
  Input.Password.displayName = 'Input.Password';

  const Form = ({ children, onFinish, layout }: { children?: React.ReactNode; onFinish?: (values: unknown) => void; layout?: string }) =>
    React.createElement('form', { onSubmit: (e: React.FormEvent) => { e.preventDefault(); onFinish?.({ password: 'test-password' }); } }, children);
  Form.useForm = () => [{ resetFields: jest.fn(), getFieldValue: jest.fn() }];
  Form.Item = ({ children, name }: { children?: React.ReactNode; name?: string }) =>
    React.createElement('div', { 'data-form-item': name }, children);

  const Flex = ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', null, children);

  const Typography = {
    Title: ({ children, level }: { children?: React.ReactNode; level?: number }) =>
      React.createElement(`h${level ?? 1}`, null, children),
    Text: ({ children, type }: { children?: React.ReactNode; type?: string }) =>
      React.createElement('span', { 'data-text-type': type }, children),
  };

  const Spin = () => React.createElement('span', { 'aria-label': 'loading' }, 'Loading...');
  const Card = ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', null, children);

  return { Button, Input, Form, Flex, Typography, Spin, Card };
});

// Stub the FormFlex / ui components
jest.mock('../../../components/ui/FormFlex', () => {
  const React = require('react');
  return {
    FormFlex: ({
      children,
      onFinish,
      form,
      layout,
    }: {
      children?: React.ReactNode;
      onFinish?: (values: unknown) => void;
      form?: unknown;
      layout?: string;
    }) =>
      React.createElement(
        'form',
        {
          'data-testid': 'login-form',
          onSubmit: (e: React.FormEvent) => {
            e.preventDefault();
            onFinish?.({ password: 'test-password' });
          },
        },
        children,
      ),
  };
});

jest.mock('../../../components/ui/Typography', () => ({
  FormLabel: ({ children }: { children?: React.ReactNode }) => {
    const React = require('react');
    return React.createElement('label', null, children);
  },
}));

jest.mock('../../../components/SetupPage/SetupWelcomeCreate', () => ({
  SetupWelcomeCreate: () => {
    const React = require('react');
    return React.createElement('div', { 'data-testid': 'setup-welcome-create' });
  },
}));

jest.mock('../../../components/ui', () => ({
  ContentTransition: ({ children }: { children?: React.ReactNode }) => {
    const React = require('react');
    return React.createElement('div', null, children);
  },
}));

// ---------------------------------------------------------------------------
// Service mocks
// ---------------------------------------------------------------------------

jest.mock('../../../service/Account', () => ({
  AccountService: {
    loginAccount: jest.fn(),
  },
}));

jest.mock('../../../service/Wallet', () => ({
  WalletService: {
    getRecoverySeedPhrase: jest.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Hook mocks
// ---------------------------------------------------------------------------

const mockGoto = jest.fn();
const mockGotoPage = jest.fn();
const mockSetUserLoggedIn = jest.fn();
const mockSetMnemonicExists = jest.fn();
const mockUpdateBalances = jest.fn();
const mockMessageError = jest.fn();

const mockUseOnlineStatusContext = jest.fn();
const mockUseServices = jest.fn();
const mockUseMasterBalances = jest.fn();
const mockUseBackupSigner = jest.fn();

jest.mock('../../../hooks', () => ({
  useSetup: jest.fn(() => ({ goto: mockGoto })),
  usePageState: jest.fn(() => ({
    goto: mockGotoPage,
    setUserLoggedIn: mockSetUserLoggedIn,
  })),
  useMnemonicExists: jest.fn(() => ({
    setMnemonicExists: mockSetMnemonicExists,
  })),
  useBalanceContext: jest.fn(() => ({ updateBalances: mockUpdateBalances })),
  useOnlineStatusContext: (...args: unknown[]) =>
    mockUseOnlineStatusContext(...args),
  useServices: (...args: unknown[]) => mockUseServices(...args),
  useMasterBalances: (...args: unknown[]) => mockUseMasterBalances(...args),
  useBackupSigner: (...args: unknown[]) => mockUseBackupSigner(...args),
}));

jest.mock('../../../context/MessageProvider', () => ({
  useMessageApi: jest.fn(() => ({ error: mockMessageError })),
}));

jest.mock('../../../utils', () => ({
  asEvmChainId: jest.fn((v: unknown) => v),
  getErrorMessage: jest.fn((e: unknown) =>
    e instanceof Error ? e.message : String(e),
  ),
}));

// Import after mocks
import { SetupWelcomeLogin } from '../../../components/SetupPage/SetupWelcome';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockLoginAccount = AccountService.loginAccount as jest.Mock;
const mockGetRecoverySeedPhrase = WalletService.getRecoverySeedPhrase as jest.Mock;

/**
 * Set hooks so isApplicationReady stays false after login resolves,
 * meaning useSetupNavigation's navigation effect will NOT fire.
 * isFetched=false and isLoaded=false keep isApplicationReady = false.
 */
const setupHooksApplicationNotReady = () => {
  mockUseOnlineStatusContext.mockReturnValue({ isOnline: true });
  mockUseServices.mockReturnValue({
    selectedService: undefined,
    selectedAgentConfig: {
      evmHomeChainId: 100,
      servicePublicId: 'test',
      isAgentEnabled: true,
    },
    services: [],
    isFetched: false,
  });
  mockUseMasterBalances.mockReturnValue({
    getMasterEoaNativeBalanceOf: jest.fn(() => null),
    isLoaded: false,
  });
  mockUseBackupSigner.mockReturnValue(undefined);
};

const renderSetupWelcomeLogin = () => render(<SetupWelcomeLogin />);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SetupWelcomeLogin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupHooksApplicationNotReady();
    mockUpdateBalances.mockResolvedValue(undefined);
    mockGetRecoverySeedPhrase.mockResolvedValue(undefined);
  });

  describe('error path — login failure', () => {
    it('re-activates the button immediately when loginAccount rejects', async () => {
      mockLoginAccount.mockRejectedValue(new Error('Wrong password'));

      renderSetupWelcomeLogin();

      // Verify button starts as not-loading (not disabled)
      const button = screen.getByRole('button', { name: /continue/i });
      expect(button).not.toBeDisabled();

      // Submit the form
      fireEvent.submit(screen.getByTestId('login-form'));

      // Error message should be shown
      await waitFor(() => {
        expect(mockMessageError).toHaveBeenCalledWith('Wrong password');
      });

      // Button should be re-activated after catch block runs
      await waitFor(() => {
        const btn = screen.getByRole('button', { name: /continue/i });
        expect(btn).not.toBeDisabled();
      });
    });

    it('does not call setUserLoggedIn on login failure', async () => {
      mockLoginAccount.mockRejectedValue(new Error('Wrong password'));

      renderSetupWelcomeLogin();
      fireEvent.submit(screen.getByTestId('login-form'));

      await waitFor(() => {
        expect(mockMessageError).toHaveBeenCalledTimes(1);
      });

      expect(mockSetUserLoggedIn).not.toHaveBeenCalled();
    });
  });

  describe('success path — button stays in loading state', () => {
    it('keeps the button disabled after handleLogin resolves on success', async () => {
      // Login and wallet calls succeed
      mockLoginAccount.mockResolvedValue({ message: 'ok' });

      renderSetupWelcomeLogin();

      // Button starts enabled
      expect(
        screen.getByRole('button', { name: /continue/i }),
      ).not.toBeDisabled();

      // Submit the form
      fireEvent.submit(screen.getByTestId('login-form'));

      // Wait for setUserLoggedIn to be called — this means handleLogin has
      // completed the success path (setCanNavigate + setUserLoggedIn called).
      await waitFor(() => {
        expect(mockSetUserLoggedIn).toHaveBeenCalledTimes(1);
      });

      // The button must remain disabled: setIsLoggingIn(false) must NOT have
      // been called via the finally block. It will only be called by
      // useSetupNavigation when isApplicationReady becomes true.
      // When loading=true the antd Button renders its loading content, so
      // query by type rather than name.
      const submitButton = screen
        .getAllByRole('button')
        .find((btn) => btn.getAttribute('type') === 'submit');
      expect(submitButton).toBeDefined();
      expect(submitButton).toBeDisabled();
    });

    it('does not show an error message on successful login', async () => {
      mockLoginAccount.mockResolvedValue({ message: 'ok' });

      renderSetupWelcomeLogin();
      fireEvent.submit(screen.getByTestId('login-form'));

      await waitFor(() => {
        expect(mockSetUserLoggedIn).toHaveBeenCalledTimes(1);
      });

      expect(mockMessageError).not.toHaveBeenCalled();
    });
  });
});
