import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

// Import after mocks
import { SetupWelcomeLogin } from '../../../components/SetupPage/SetupWelcome';
import { AccountService } from '../../../service/Account';
import { WalletService } from '../../../service/Wallet';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'styled-components',
  () => require('../../mocks/styledComponents').styledComponentsMock,
);

jest.mock('../../../constants/providers', () => ({}));
jest.mock('../../../config/providers', () => ({ providers: [] }));

// Stub antd so no ESM imports are triggered
jest.mock('antd', () => {
  const R = require('react');

  const Button = R.forwardRef(
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
      R.createElement(
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
    Password: R.forwardRef(
      (
        props: { size?: string; onChange?: (e: unknown) => void },
        ref: React.Ref<HTMLInputElement>,
      ) =>
        R.createElement('input', {
          ref,
          type: 'password',
          role: 'textbox',
          onChange: props.onChange,
        }),
    ),
  };
  Input.Password.displayName = 'Input.Password';

  const Form = ({
    children,
    onFinish,
  }: {
    children?: React.ReactNode;
    onFinish?: (values: unknown) => void;
    layout?: string;
  }) =>
    R.createElement(
      'form',
      {
        onSubmit: (e: React.FormEvent) => {
          e.preventDefault();
          onFinish?.({ password: 'test-password' });
        },
      },
      children,
    );
  Form.useForm = () => [{ resetFields: jest.fn(), getFieldValue: jest.fn() }];
  Form.Item = ({
    children,
    name,
  }: {
    children?: React.ReactNode;
    name?: string;
  }) => R.createElement('div', { 'data-form-item': name }, children);

  const Flex = ({ children }: { children?: React.ReactNode }) =>
    R.createElement('div', null, children);

  const Typography = {
    Title: ({
      children,
      level,
    }: {
      children?: React.ReactNode;
      level?: number;
    }) => R.createElement(`h${level ?? 1}`, null, children),
    Text: ({ children, type }: { children?: React.ReactNode; type?: string }) =>
      R.createElement('span', { 'data-text-type': type }, children),
  };

  const Spin = () =>
    R.createElement('span', { 'aria-label': 'loading' }, 'Loading...');
  const Card = ({ children }: { children?: React.ReactNode }) =>
    R.createElement('div', null, children);

  return { Button, Input, Form, Flex, Typography, Spin, Card };
});

jest.mock('../../../components/ui/FormFlex', () => {
  const R = require('react');
  return {
    FormFlex: ({
      children,
      onFinish,
    }: {
      children?: React.ReactNode;
      onFinish?: (values: unknown) => void;
      form?: unknown;
      layout?: string;
    }) =>
      R.createElement(
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
  FormLabel: ({ children }: { children?: React.ReactNode }) =>
    require('react').createElement('label', null, children),
}));

jest.mock('../../../components/SetupPage/SetupWelcomeCreate', () => ({
  SetupWelcomeCreate: () =>
    require('react').createElement('div', {
      'data-testid': 'setup-welcome-create',
    }),
}));

jest.mock('../../../components/ui', () => ({
  ContentTransition: ({ children }: { children?: React.ReactNode }) =>
    require('react').createElement('div', null, children),
}));
/* eslint-enable @typescript-eslint/no-var-requires */

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
const mockUseBackupSigner = jest.fn();
const mockUseIsInitiallyFunded = jest.fn();

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
  useBackupSigner: (...args: unknown[]) => mockUseBackupSigner(...args),
  useIsInitiallyFunded: (...args: unknown[]) =>
    mockUseIsInitiallyFunded(...args),
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockLoginAccount = AccountService.loginAccount as jest.Mock;
const mockGetRecoverySeedPhrase =
  WalletService.getRecoverySeedPhrase as jest.Mock;

/**
 * Set hooks so isApplicationReady stays false after login resolves,
 * meaning useSetupNavigation's navigation effect will NOT fire.
 * isFetched=false keeps isApplicationReady = false.
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
  mockUseBackupSigner.mockReturnValue(undefined);
  mockUseIsInitiallyFunded.mockReturnValue({ isInitialFunded: false });
};

/**
 * Set hooks so isApplicationReady becomes true (isServicesFetched=true)
 * and isInitialFunded=true so the effect navigates directly to Main.
 */
const setupHooksInitialFunded = () => {
  mockUseOnlineStatusContext.mockReturnValue({ isOnline: true });
  mockUseServices.mockReturnValue({
    selectedService: { home_chain: 100, service_config_id: 'cfg-1' },
    selectedAgentConfig: {
      evmHomeChainId: 100,
      servicePublicId: 'test-public-id',
      middlewareHomeChainId: 100,
      isAgentEnabled: true,
    },
    services: [{ service_public_id: 'test-public-id', home_chain: 100 }],
    isFetched: true,
  });
  mockUseBackupSigner.mockReturnValue('0xbackup');
  mockUseIsInitiallyFunded.mockReturnValue({ isInitialFunded: true });
};

/**
 * Set hooks so isApplicationReady becomes true and isInitialFunded=false
 * so the effect redirects to FundYourAgent.
 */
const setupHooksNotInitialFunded = () => {
  mockUseOnlineStatusContext.mockReturnValue({ isOnline: true });
  mockUseServices.mockReturnValue({
    selectedService: { home_chain: 100, service_config_id: 'cfg-1' },
    selectedAgentConfig: {
      evmHomeChainId: 100,
      servicePublicId: 'test-public-id',
      middlewareHomeChainId: 100,
      isAgentEnabled: true,
    },
    services: [{ service_public_id: 'test-public-id', home_chain: 100 }],
    isFetched: true,
  });
  mockUseBackupSigner.mockReturnValue('0xbackup');
  mockUseIsInitiallyFunded.mockReturnValue({ isInitialFunded: false });
};

/**
 * Set hooks so isApplicationReady becomes true and isInitialFunded=undefined
 * (store still hydrating / legacy unmigrated boolean / no selectedServiceConfigId).
 * Should fall through to Main, not redirect to FundYourAgent.
 */
const setupHooksInitialFundedUndefined = () => {
  mockUseOnlineStatusContext.mockReturnValue({ isOnline: true });
  mockUseServices.mockReturnValue({
    selectedService: { home_chain: 100, service_config_id: 'cfg-1' },
    selectedAgentConfig: {
      evmHomeChainId: 100,
      servicePublicId: 'test-public-id',
      middlewareHomeChainId: 100,
      isAgentEnabled: true,
    },
    services: [{ service_public_id: 'test-public-id', home_chain: 100 }],
    isFetched: true,
  });
  mockUseBackupSigner.mockReturnValue('0xbackup');
  mockUseIsInitiallyFunded.mockReturnValue({ isInitialFunded: undefined });
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

      // Button starts enabled
      const button = screen.getByRole('button', { name: /continue/i });
      expect(button).not.toBeDisabled();

      // Submit the form
      fireEvent.submit(screen.getByTestId('login-form'));

      // Error message shown
      await waitFor(() => {
        expect(mockMessageError).toHaveBeenCalledWith('Wrong password');
      });

      // Button re-activated by catch block
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
      mockLoginAccount.mockResolvedValue({ message: 'ok' });

      renderSetupWelcomeLogin();

      // Button starts enabled
      expect(
        screen.getByRole('button', { name: /continue/i }),
      ).not.toBeDisabled();

      // Submit the form
      fireEvent.submit(screen.getByTestId('login-form'));

      // Wait for setUserLoggedIn — handleLogin success path complete.
      await waitFor(() => {
        expect(mockSetUserLoggedIn).toHaveBeenCalledTimes(1);
      });

      // Button must remain disabled: the finally block was removed so
      // setIsLoggingIn(false) is NOT called here. useSetupNavigation will
      // call it only when isApplicationReady becomes true.
      // When loading=true the Button renders "Loading..." so query by type.
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

  describe('isInitialFunded routing', () => {
    it('navigates to Main when isInitialFunded is true', async () => {
      setupHooksInitialFunded();
      mockLoginAccount.mockResolvedValue({ message: 'ok' });

      renderSetupWelcomeLogin();

      fireEvent.submit(screen.getByTestId('login-form'));

      await waitFor(() => {
        expect(mockSetUserLoggedIn).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(mockGotoPage).toHaveBeenCalledWith(
          expect.stringContaining('Main'),
        );
      });
    });

    it('does not route to FundYourAgent when isInitialFunded is true', async () => {
      setupHooksInitialFunded();
      mockLoginAccount.mockResolvedValue({ message: 'ok' });

      renderSetupWelcomeLogin();
      fireEvent.submit(screen.getByTestId('login-form'));

      await waitFor(() => {
        expect(mockSetUserLoggedIn).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(mockGotoPage).toHaveBeenCalled();
      });

      expect(mockGoto).not.toHaveBeenCalledWith(
        expect.stringContaining('FundYourAgent'),
      );
    });

    it('redirects to FundYourAgent when isInitialFunded is false', async () => {
      setupHooksNotInitialFunded();
      mockLoginAccount.mockResolvedValue({ message: 'ok' });

      renderSetupWelcomeLogin();
      fireEvent.submit(screen.getByTestId('login-form'));

      await waitFor(() => {
        expect(mockSetUserLoggedIn).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(mockGoto).toHaveBeenCalledWith(
          expect.stringContaining('FundYourAgent'),
        );
      });

      expect(mockGotoPage).not.toHaveBeenCalledWith(
        expect.stringContaining('Main'),
      );
    });

    it('falls through to Main when isInitialFunded is undefined (store hydrating / legacy)', async () => {
      setupHooksInitialFundedUndefined();
      mockLoginAccount.mockResolvedValue({ message: 'ok' });

      renderSetupWelcomeLogin();
      fireEvent.submit(screen.getByTestId('login-form'));

      await waitFor(() => {
        expect(mockSetUserLoggedIn).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(mockGotoPage).toHaveBeenCalledWith(
          expect.stringContaining('Main'),
        );
      });

      expect(mockGoto).not.toHaveBeenCalledWith(
        expect.stringContaining('FundYourAgent'),
      );
    });
  });
});
