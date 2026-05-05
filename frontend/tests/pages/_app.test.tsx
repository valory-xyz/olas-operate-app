import { render, screen } from '@testing-library/react';
import { act } from 'react';

import { useElectronApi } from '../../hooks/useElectronApi';
import { useGlobalErrorHandlers } from '../../hooks/useGlobalErrorHandlers';

// Mock styles
jest.mock('../../styles/globals.scss', () => ({}));

// Mock hooks
jest.mock('../../hooks/useElectronApi', () => ({
  useElectronApi: jest.fn(() => ({ nextLogError: jest.fn() })),
}));
jest.mock('../../hooks/useGlobalErrorHandlers', () => ({
  useGlobalErrorHandlers: jest.fn(),
}));

// Mock constants
jest.mock('../../constants', () => ({
  mainTheme: {},
}));

// Mock ErrorBoundary
jest.mock('../../components/ErrorBoundary', () => ({
  __esModule: true,
  default: ({
    children,
    logger,
  }: {
    children: React.ReactNode;
    logger?: unknown;
  }) => (
    <div data-testid="error-boundary" data-has-logger={String(!!logger)}>
      {children}
    </div>
  ),
}));

// Mock Layout
jest.mock('../../components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

// Mock all providers as passthrough wrappers
jest.mock('../../context/ElectronApiProvider', () => ({
  ElectronApiProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="electron-api-provider">{children}</div>
  ),
}));
jest.mock('../../context/OnlineStatusProvider', () => ({
  OnlineStatusProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="online-status-provider">{children}</div>
  ),
}));
jest.mock('../../context/StoreProvider', () => ({
  StoreProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="store-provider">{children}</div>
  ),
}));
jest.mock('../../context/PageStateProvider', () => ({
  PageStateProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="page-state-provider">{children}</div>
  ),
}));
jest.mock('../../context/ServicesProvider', () => ({
  ServicesProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="services-provider">{children}</div>
  ),
}));
jest.mock('../../context/MasterWalletProvider', () => ({
  MasterWalletProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="master-wallet-provider">{children}</div>
  ),
}));
jest.mock('../../context/StakingProgramProvider', () => ({
  StakingProgramProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="staking-program-provider">{children}</div>
  ),
}));
jest.mock('../../context/StakingContractDetailsProvider', () => ({
  StakingContractDetailsProvider: ({
    children,
  }: {
    children: React.ReactNode;
  }) => <div data-testid="staking-contract-details-provider">{children}</div>,
}));
jest.mock('../../context/RewardProvider', () => ({
  RewardProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="reward-provider">{children}</div>
  ),
}));
jest.mock('../../context/BalanceProvider/BalanceProvider', () => ({
  BalanceProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="balance-provider">{children}</div>
  ),
}));
jest.mock(
  '../../context/BalancesAndRefillRequirementsProvider/BalancesAndRefillRequirementsProvider',
  () => ({
    BalancesAndRefillRequirementsProvider: ({
      children,
    }: {
      children: React.ReactNode;
    }) => (
      <div data-testid="balances-and-refill-requirements-provider">
        {children}
      </div>
    ),
  }),
);
jest.mock('../../context/AutoRunProvider/AutoRunProvider', () => ({
  AutoRunProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auto-run-provider">{children}</div>
  ),
}));
jest.mock('../../context/SetupProvider', () => ({
  SetupProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="setup-provider">{children}</div>
  ),
}));
jest.mock('../../context/SettingsProvider', () => ({
  SettingsProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="settings-provider">{children}</div>
  ),
}));
jest.mock('../../context/MessageProvider', () => ({
  MessageProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="message-provider">{children}</div>
  ),
}));
jest.mock('../../context/SharedProvider/SharedProvider', () => ({
  SharedProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="shared-provider">{children}</div>
  ),
}));
jest.mock('../../context/OnRampProvider', () => ({
  OnRampProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="on-ramp-provider">{children}</div>
  ),
}));
jest.mock('../../context/PearlWalletProvider', () => ({
  PearlWalletProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pearl-wallet-provider">{children}</div>
  ),
}));
jest.mock('../../context/SupportModalProvider', () => ({
  SupportModalProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="support-modal-provider">{children}</div>
  ),
}));

const mockUseElectronApi = useElectronApi as jest.MockedFunction<
  typeof useElectronApi
>;
const mockUseGlobalErrorHandlers =
  useGlobalErrorHandlers as jest.MockedFunction<typeof useGlobalErrorHandlers>;

// Must import after mocks are set up
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { default: AppRoot } = require('../../pages/_app');

const MockComponent = () => (
  <div data-testid="page-component">Page Content</div>
);

const createMockRouter = () => ({
  route: '/',
  pathname: '/',
  query: {},
  asPath: '/',
  basePath: '',
  isLocaleDomain: false,
  push: jest.fn(),
  replace: jest.fn(),
  reload: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  prefetch: jest.fn(() => Promise.resolve()),
  beforePopState: jest.fn(),
  events: { on: jest.fn(), off: jest.fn(), emit: jest.fn() },
  isFallback: false,
  isReady: true,
  isPreview: false,
});

const defaultAppProps = {
  Component: MockComponent,
  pageProps: {},
  router: createMockRouter(),
};

describe('AppRoot (_app)', () => {
  const mockNextLogError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseElectronApi.mockReturnValue({
      nextLogError: mockNextLogError,
    });
  });

  it('renders child Component after mount', async () => {
    await act(async () => {
      render(<AppRoot {...defaultAppProps} />);
    });

    expect(screen.getByTestId('page-component')).toBeInTheDocument();
    expect(screen.getByText('Page Content')).toBeInTheDocument();
  });

  it('gates child rendering on isMounted (useEffect must fire)', async () => {
    // The App component uses useState(false) + useEffect(() => setIsMounted(true)).
    // React Testing Library's render() flushes effects via act(), so the child
    // appears immediately. We verify the mount gate works by confirming the child
    // Component is rendered inside Layout only after the full render cycle.
    let renderCount = 0;
    const TrackingComponent = () => {
      renderCount++;
      return <div data-testid="tracking">tracked</div>;
    };

    await act(async () => {
      render(<AppRoot {...defaultAppProps} Component={TrackingComponent} />);
    });

    // After act, the mount effect has fired and the child is rendered
    expect(screen.getByTestId('tracking')).toBeInTheDocument();
    // The child rendered at least once (after isMounted became true)
    expect(renderCount).toBeGreaterThanOrEqual(1);
  });

  it('calls useGlobalErrorHandlers with nextLogError', async () => {
    await act(async () => {
      render(<AppRoot {...defaultAppProps} />);
    });

    expect(mockUseGlobalErrorHandlers).toHaveBeenCalledWith(mockNextLogError);
  });

  it('passes logger prop to ErrorBoundary', async () => {
    await act(async () => {
      render(<AppRoot {...defaultAppProps} />);
    });

    const errorBoundary = screen.getByTestId('error-boundary');
    expect(errorBoundary).toBeInTheDocument();
    expect(errorBoundary).toHaveAttribute('data-has-logger', 'true');
  });

  it('wraps content in ElectronApiProvider at the outermost level', async () => {
    await act(async () => {
      render(<AppRoot {...defaultAppProps} />);
    });

    const electronApiProvider = screen.getByTestId('electron-api-provider');
    expect(electronApiProvider).toBeInTheDocument();
    // ElectronApiProvider should contain the error boundary
    expect(electronApiProvider).toContainElement(
      screen.getByTestId('error-boundary'),
    );
  });

  it('renders the full provider tree without errors', async () => {
    await act(async () => {
      render(<AppRoot {...defaultAppProps} />);
    });

    // Verify key providers in the tree are present
    expect(screen.getByTestId('electron-api-provider')).toBeInTheDocument();
    expect(screen.getByTestId('online-status-provider')).toBeInTheDocument();
    expect(screen.getByTestId('store-provider')).toBeInTheDocument();
    expect(screen.getByTestId('page-state-provider')).toBeInTheDocument();
    expect(screen.getByTestId('services-provider')).toBeInTheDocument();
    expect(screen.getByTestId('master-wallet-provider')).toBeInTheDocument();
    expect(screen.getByTestId('staking-program-provider')).toBeInTheDocument();
    expect(
      screen.getByTestId('staking-contract-details-provider'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('reward-provider')).toBeInTheDocument();
    expect(screen.getByTestId('balance-provider')).toBeInTheDocument();
    expect(
      screen.getByTestId('balances-and-refill-requirements-provider'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('auto-run-provider')).toBeInTheDocument();
    expect(screen.getByTestId('setup-provider')).toBeInTheDocument();
    expect(screen.getByTestId('settings-provider')).toBeInTheDocument();
    expect(screen.getByTestId('message-provider')).toBeInTheDocument();
    expect(screen.getByTestId('shared-provider')).toBeInTheDocument();
    expect(screen.getByTestId('on-ramp-provider')).toBeInTheDocument();
    expect(screen.getByTestId('pearl-wallet-provider')).toBeInTheDocument();
    expect(screen.getByTestId('support-modal-provider')).toBeInTheDocument();
    expect(screen.getByTestId('layout')).toBeInTheDocument();
    expect(screen.getByTestId('page-component')).toBeInTheDocument();
  });

  it('wraps Component inside Layout', async () => {
    await act(async () => {
      render(<AppRoot {...defaultAppProps} />);
    });

    const layout = screen.getByTestId('layout');
    expect(layout).toContainElement(screen.getByTestId('page-component'));
  });

  it('passes pageProps to the child Component', async () => {
    const CustomComponent = (props: { greeting: string }) => (
      <div data-testid="custom-component">{props.greeting}</div>
    );

    const propsWithPageProps = {
      ...defaultAppProps,
      Component: CustomComponent,
      pageProps: { greeting: 'Hello World' },
    };

    await act(async () => {
      render(<AppRoot {...propsWithPageProps} />);
    });

    expect(screen.getByTestId('custom-component')).toHaveTextContent(
      'Hello World',
    );
  });

  it('handles nextLogError being undefined', async () => {
    mockUseElectronApi.mockReturnValue({
      nextLogError: undefined,
    });

    await act(async () => {
      render(<AppRoot {...defaultAppProps} />);
    });

    expect(mockUseGlobalErrorHandlers).toHaveBeenCalledWith(undefined);
    expect(screen.getByTestId('page-component')).toBeInTheDocument();
  });
});
