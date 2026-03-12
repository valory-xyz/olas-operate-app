import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import { act, PropsWithChildren, useContext } from 'react';

import { AGENT_CONFIG } from '../../../config/agents';
import { AddressZero } from '../../../constants/address';
import { AgentMap } from '../../../constants/agent';
import { EvmChainIdMap, MiddlewareChainMap } from '../../../constants/chains';
import { MiddlewareDeploymentStatusMap } from '../../../constants/deployment';
import {
  BalancesAndRefillRequirementsProvider,
  BalancesAndRefillRequirementsProviderContext,
} from '../../../context/BalancesAndRefillRequirementsProvider/BalancesAndRefillRequirementsProvider';
import { BalancesAndFundingRequirements } from '../../../types/Funding';
import { Service } from '../../../types/Service';
import {
  DEFAULT_SAFE_ADDRESS,
  DEFAULT_SERVICE_CONFIG_ID,
  makeMasterSafe,
  makeService,
  MOCK_SERVICE_CONFIG_ID_2,
  SERVICE_PUBLIC_ID_MAP,
} from '../../helpers/factories';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock('ethers-multicall', () => ({ Contract: jest.fn() }));
jest.mock('../../../constants/providers', () => ({}));
jest.mock('../../../config/providers', () => ({ providers: [] }));
/* eslint-enable @typescript-eslint/no-var-requires */

const mockGetBalancesAndFundingRequirements = jest.fn();
const mockGetAllBalancesAndFundingRequirements = jest.fn();

jest.mock('../../../service/Balance', () => ({
  BalanceService: {
    getBalancesAndFundingRequirements: (
      ...args: unknown[]
    ): Promise<BalancesAndFundingRequirements> =>
      mockGetBalancesAndFundingRequirements(...args),
    getAllBalancesAndFundingRequirements: (
      ...args: unknown[]
    ): Promise<Record<string, BalancesAndFundingRequirements>> =>
      mockGetAllBalancesAndFundingRequirements(...args),
  },
}));

const mockUseServices = jest.fn();
jest.mock('../../../hooks/useServices', () => ({
  useServices: () => mockUseServices(),
}));

const mockUseMasterWalletContext = jest.fn();
jest.mock('../../../hooks/useWallet', () => ({
  useMasterWalletContext: () => mockUseMasterWalletContext(),
}));

const mockUseRewardContext = jest.fn();
jest.mock('../../../hooks/useRewardContext', () => ({
  useRewardContext: () => mockUseRewardContext(),
}));

const mockUsePageState = jest.fn();
jest.mock('../../../hooks/usePageState', () => ({
  usePageState: () => mockUsePageState(),
}));

const mockUseOnlineStatusContext = jest.fn();
jest.mock('../../../hooks/useOnlineStatus', () => ({
  useOnlineStatusContext: () => mockUseOnlineStatusContext(),
}));

const mockUseStore = jest.fn();
jest.mock('../../../hooks', () => ({
  useDynamicRefetchInterval: jest.fn((interval: number | false) => interval),
  useMasterWalletContext: () => mockUseMasterWalletContext(),
  useStore: () => mockUseStore(),
}));

// --- helpers ---

const traderConfig = AGENT_CONFIG[AgentMap.PredictTrader];
const gnosisChainKey = MiddlewareChainMap.GNOSIS;

const defaultService: Service = {
  ...makeService({
    service_config_id: DEFAULT_SERVICE_CONFIG_ID,
    service_public_id: SERVICE_PUBLIC_ID_MAP.TRADER,
    home_chain: MiddlewareChainMap.GNOSIS,
    deploymentStatus: MiddlewareDeploymentStatusMap.DEPLOYED,
  }),
  deploymentStatus: MiddlewareDeploymentStatusMap.DEPLOYED,
};

// - refill: 0.5 XDAI gas top-up
// - total: 2 XDAI (includes safe creation threshold)
// - agent funding: 0.3 XDAI for EOA gas
const REFILL_NATIVE_WEI = '500000000000000000'; // 0.5 XDAI
const TOTAL_NATIVE_WEI = '2000000000000000000'; // 2 XDAI
const AGENT_FUNDING_NATIVE_WEI = '300000000000000000'; // 0.3 XDAI

const makeBalancesAndFundingRequirements = (
  overrides: Partial<BalancesAndFundingRequirements> = {},
): BalancesAndFundingRequirements => ({
  balances: {},
  refill_requirements: {
    [gnosisChainKey]: {
      [DEFAULT_SAFE_ADDRESS]: {
        [AddressZero]: REFILL_NATIVE_WEI,
      },
    },
  },
  total_requirements: {
    [gnosisChainKey]: {
      [DEFAULT_SAFE_ADDRESS]: {
        [AddressZero]: TOTAL_NATIVE_WEI,
      },
    },
  } as unknown as BalancesAndFundingRequirements['total_requirements'],
  agent_funding_requests: {
    [gnosisChainKey]: {
      [DEFAULT_SAFE_ADDRESS]: {
        [AddressZero]: AGENT_FUNDING_NATIVE_WEI,
      },
    },
  },
  protocol_asset_requirements: {},
  bonded_assets: {},
  is_refill_required: false,
  agent_funding_in_progress: false,
  agent_funding_requests_cooldown: false,
  allow_start_agent: true,
  ...overrides,
});

/** JSON-serializable subset of the context (functions become "[Function]"). */
type SerializedContext = {
  isBalancesAndFundingRequirementsLoading: boolean;
  isBalancesAndFundingRequirementsLoadingForAllServices: boolean;
  isBalancesAndFundingRequirementsReadyForAllServices: boolean;
  isBalancesAndFundingRequirementsEnabledForAllServices: boolean;
  refillRequirements?: unknown;
  totalRequirements?: unknown;
  agentFundingRequests?: unknown;
  canStartAgent: boolean;
  isRefillRequired: boolean;
  isAgentFundingRequestsStale: boolean;
  isPearlWalletRefillRequired: boolean;
};

/**
 * Consumer that serializes context values for assertion.
 * For function-type values, renders them as "[Function]" to keep JSON valid.
 */
const TestConsumer = () => {
  const ctx = useContext(BalancesAndRefillRequirementsProviderContext);
  const serializable: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(ctx)) {
    serializable[key] = typeof value === 'function' ? '[Function]' : value;
  }
  return <div data-testid="ctx">{JSON.stringify(serializable)}</div>;
};

const parseContext = (container: HTMLElement): SerializedContext => {
  const raw = container.querySelector('[data-testid="ctx"]')?.textContent;
  return JSON.parse(raw!) as SerializedContext;
};

type SetupOptions = {
  isOnline?: boolean;
  isUserLoggedIn?: boolean;
  services?: Service[];
  selectedService?: Service;
  masterSafes?: ReturnType<typeof makeMasterSafe>[];
  isEligibleForRewards?: boolean;
  storeState?: Record<string, unknown>;
  availableServiceConfigIds?: {
    configId: string;
    chainId: number;
    tokenId?: number;
  }[];
};

const setup = (options: SetupOptions = {}) => {
  const {
    isOnline = true,
    isUserLoggedIn = true,
    services = [defaultService],
    selectedService = defaultService,
    masterSafes = [makeMasterSafe(EvmChainIdMap.Gnosis)],
    isEligibleForRewards = true,
    storeState = {
      [AgentMap.PredictTrader]: {
        isInitialFunded: true,
        isProfileWarningDisplayed: false,
      },
    },
    availableServiceConfigIds = [
      { configId: DEFAULT_SERVICE_CONFIG_ID, chainId: EvmChainIdMap.Gnosis },
    ],
  } = options;

  mockUseOnlineStatusContext.mockReturnValue({ isOnline });
  mockUsePageState.mockReturnValue({ isUserLoggedIn });
  mockUseServices.mockReturnValue({
    services,
    selectedService,
    selectedAgentConfig: traderConfig,
    availableServiceConfigIds,
  });
  mockUseMasterWalletContext.mockReturnValue({ masterSafes });
  mockUseRewardContext.mockReturnValue({ isEligibleForRewards });
  mockUseStore.mockReturnValue({ storeState });

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  const Wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>
      <BalancesAndRefillRequirementsProvider>
        {children}
      </BalancesAndRefillRequirementsProvider>
    </QueryClientProvider>
  );

  return render(<TestConsumer />, { wrapper: Wrapper });
};

/**
 * Renders a custom consumer inside the provider with full mock setup.
 * Avoids duplicating QueryClient + mock wiring for function-testing blocks.
 */
const setupWithConsumer = (
  ConsumerComponent: () => JSX.Element,
  options: SetupOptions = {},
) => {
  const {
    isOnline = true,
    isUserLoggedIn = true,
    services = [defaultService],
    selectedService = defaultService,
    masterSafes = [makeMasterSafe(EvmChainIdMap.Gnosis)],
    isEligibleForRewards = true,
    storeState = {},
    availableServiceConfigIds = [
      { configId: DEFAULT_SERVICE_CONFIG_ID, chainId: EvmChainIdMap.Gnosis },
    ],
  } = options;

  mockUseOnlineStatusContext.mockReturnValue({ isOnline });
  mockUsePageState.mockReturnValue({ isUserLoggedIn });
  mockUseServices.mockReturnValue({
    services,
    selectedService,
    selectedAgentConfig: traderConfig,
    availableServiceConfigIds,
  });
  mockUseMasterWalletContext.mockReturnValue({ masterSafes });
  mockUseRewardContext.mockReturnValue({ isEligibleForRewards });
  mockUseStore.mockReturnValue({ storeState });

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BalancesAndRefillRequirementsProvider>
        <ConsumerComponent />
      </BalancesAndRefillRequirementsProvider>
    </QueryClientProvider>,
  );
};

// --- tests ---

describe('BalancesAndRefillRequirementsProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetBalancesAndFundingRequirements.mockResolvedValue(
      makeBalancesAndFundingRequirements(),
    );
    mockGetAllBalancesAndFundingRequirements.mockResolvedValue({
      [DEFAULT_SERVICE_CONFIG_ID]: makeBalancesAndFundingRequirements(),
    });
  });

  describe('default context values (no provider)', () => {
    it('returns defaults when no provider wraps the consumer', () => {
      const queryClient = new QueryClient();
      const { container } = render(
        <QueryClientProvider client={queryClient}>
          <TestConsumer />
        </QueryClientProvider>,
      );
      const ctx = parseContext(container);

      expect(ctx.isBalancesAndFundingRequirementsLoading).toBe(false);
      expect(ctx.canStartAgent).toBe(false);
      expect(ctx.isRefillRequired).toBe(true);
      expect(ctx.isAgentFundingRequestsStale).toBe(false);
      expect(ctx.isPearlWalletRefillRequired).toBe(false);
      expect(ctx.refillRequirements).toBeUndefined();
      expect(ctx.totalRequirements).toBeUndefined();
      expect(ctx.agentFundingRequests).toBeUndefined();
    });
  });

  describe('isRefillRequired', () => {
    it('is true when data is undefined (uses || not ??)', async () => {
      // When the query has not resolved yet or is disabled,
      // the expression `data?.is_refill_required || true` always yields true.
      mockGetBalancesAndFundingRequirements.mockReturnValue(
        new Promise(() => {}), // never resolves
      );
      mockGetAllBalancesAndFundingRequirements.mockReturnValue(
        new Promise(() => {}),
      );

      const { container } = setup();
      // While loading, data is undefined => isRefillRequired should be true
      const ctx = parseContext(container);
      expect(ctx.isRefillRequired).toBe(true);
    });

    it('is true when is_refill_required is true', async () => {
      mockGetBalancesAndFundingRequirements.mockResolvedValue(
        makeBalancesAndFundingRequirements({ is_refill_required: true }),
      );

      const { container } = setup();
      await waitFor(() => {
        const ctx = parseContext(container);
        expect(ctx.isBalancesAndFundingRequirementsLoading).toBe(false);
        expect(ctx.isRefillRequired).toBe(true);
      });
    });

    it('is false when is_refill_required is false', async () => {
      mockGetBalancesAndFundingRequirements.mockResolvedValue(
        makeBalancesAndFundingRequirements({ is_refill_required: false }),
      );

      const { container } = setup();
      await waitFor(() => {
        const ctx = parseContext(container);
        expect(ctx.isBalancesAndFundingRequirementsLoading).toBe(false);
        expect(ctx.isRefillRequired).toBe(false);
      });
    });
  });

  describe('canStartAgent', () => {
    it('is false when data is undefined', () => {
      mockGetBalancesAndFundingRequirements.mockReturnValue(
        new Promise(() => {}),
      );
      mockGetAllBalancesAndFundingRequirements.mockReturnValue(
        new Promise(() => {}),
      );

      const { container } = setup();
      const ctx = parseContext(container);
      expect(ctx.canStartAgent).toBe(false);
    });

    it('reflects allow_start_agent when data is loaded', async () => {
      mockGetBalancesAndFundingRequirements.mockResolvedValue(
        makeBalancesAndFundingRequirements({ allow_start_agent: true }),
      );

      const { container } = setup();
      await waitFor(() => {
        const ctx = parseContext(container);
        expect(ctx.canStartAgent).toBe(true);
      });
    });

    it('is false when allow_start_agent is false', async () => {
      mockGetBalancesAndFundingRequirements.mockResolvedValue(
        makeBalancesAndFundingRequirements({ allow_start_agent: false }),
      );

      const { container } = setup();
      await waitFor(() => {
        const ctx = parseContext(container);
        expect(ctx.isBalancesAndFundingRequirementsLoading).toBe(false);
      });
      const ctx = parseContext(container);
      expect(ctx.canStartAgent).toBe(false);
    });
  });

  describe('isAgentFundingRequestsStale', () => {
    it('is true when agent_funding_in_progress is true', async () => {
      mockGetBalancesAndFundingRequirements.mockResolvedValue(
        makeBalancesAndFundingRequirements({
          agent_funding_in_progress: true,
          agent_funding_requests_cooldown: false,
        }),
      );

      const { container } = setup();
      await waitFor(() => {
        const ctx = parseContext(container);
        expect(ctx.isAgentFundingRequestsStale).toBe(true);
      });
    });

    it('is true when agent_funding_requests_cooldown is true', async () => {
      mockGetBalancesAndFundingRequirements.mockResolvedValue(
        makeBalancesAndFundingRequirements({
          agent_funding_in_progress: false,
          agent_funding_requests_cooldown: true,
        }),
      );

      const { container } = setup();
      await waitFor(() => {
        const ctx = parseContext(container);
        expect(ctx.isAgentFundingRequestsStale).toBe(true);
      });
    });

    it('is false when both flags are false', async () => {
      mockGetBalancesAndFundingRequirements.mockResolvedValue(
        makeBalancesAndFundingRequirements({
          agent_funding_in_progress: false,
          agent_funding_requests_cooldown: false,
        }),
      );

      const { container } = setup();
      await waitFor(() => {
        const ctx = parseContext(container);
        expect(ctx.isBalancesAndFundingRequirementsLoading).toBe(false);
      });
      const ctx = parseContext(container);
      expect(ctx.isAgentFundingRequestsStale).toBe(false);
    });
  });

  describe('refillRequirements', () => {
    it('extracts refill_requirements from the correct home chain key', async () => {
      const expectedRequirements = {
        [DEFAULT_SAFE_ADDRESS]: {
          [AddressZero]: REFILL_NATIVE_WEI,
        },
      };
      mockGetBalancesAndFundingRequirements.mockResolvedValue(
        makeBalancesAndFundingRequirements({
          refill_requirements: { [gnosisChainKey]: expectedRequirements },
        }),
      );

      const { container } = setup();
      await waitFor(() => {
        const ctx = parseContext(container);
        expect(ctx.refillRequirements).toEqual(expectedRequirements);
      });
    });

    it('is undefined when data is not yet loaded', () => {
      mockGetBalancesAndFundingRequirements.mockReturnValue(
        new Promise(() => {}),
      );

      const { container } = setup();
      const ctx = parseContext(container);
      expect(ctx.refillRequirements).toBeUndefined();
    });
  });

  describe('totalRequirements', () => {
    it('extracts total_requirements from the correct home chain key', async () => {
      const expectedRequirements = {
        [DEFAULT_SAFE_ADDRESS]: {
          [AddressZero]: TOTAL_NATIVE_WEI,
        },
      };
      mockGetBalancesAndFundingRequirements.mockResolvedValue(
        makeBalancesAndFundingRequirements({
          total_requirements: {
            [gnosisChainKey]: expectedRequirements,
          } as unknown as BalancesAndFundingRequirements['total_requirements'],
        }),
      );

      const { container } = setup();
      await waitFor(() => {
        const ctx = parseContext(container);
        expect(ctx.totalRequirements).toEqual(expectedRequirements);
      });
    });
  });

  describe('agentFundingRequests', () => {
    it('extracts agent_funding_requests from the correct home chain key', async () => {
      const expectedRequests = {
        [DEFAULT_SAFE_ADDRESS]: {
          [AddressZero]: AGENT_FUNDING_NATIVE_WEI,
        },
      };
      mockGetBalancesAndFundingRequirements.mockResolvedValue(
        makeBalancesAndFundingRequirements({
          agent_funding_requests: { [gnosisChainKey]: expectedRequests },
        }),
      );

      const { container } = setup();
      await waitFor(() => {
        const ctx = parseContext(container);
        expect(ctx.agentFundingRequests).toEqual(expectedRequests);
      });
    });
  });

  describe('isPearlWalletRefillRequired', () => {
    it('is false when masterSafes is empty', async () => {
      const { container } = setup({ masterSafes: [] });
      await waitFor(() => {
        const ctx = parseContext(container);
        expect(ctx.isBalancesAndFundingRequirementsLoading).toBe(false);
      });
      const ctx = parseContext(container);
      expect(ctx.isPearlWalletRefillRequired).toBe(false);
    });

    it('is false when services is empty', async () => {
      const { container } = setup({ services: [] });
      await waitFor(() => {
        const ctx = parseContext(container);
        expect(ctx.isBalancesAndFundingRequirementsLoading).toBe(false);
      });
      const ctx = parseContext(container);
      expect(ctx.isPearlWalletRefillRequired).toBe(false);
    });

    it('is true when service refill is required AND isInitialFunded is true', async () => {
      mockGetAllBalancesAndFundingRequirements.mockResolvedValue({
        [DEFAULT_SERVICE_CONFIG_ID]: makeBalancesAndFundingRequirements({
          is_refill_required: true,
        }),
      });

      const { container } = setup({
        services: [
          {
            ...makeService({
              service_config_id: DEFAULT_SERVICE_CONFIG_ID,
              service_public_id: SERVICE_PUBLIC_ID_MAP.TRADER,
              home_chain: MiddlewareChainMap.GNOSIS,
            }),
            deploymentStatus: MiddlewareDeploymentStatusMap.DEPLOYED,
          },
        ],
        storeState: {
          [AgentMap.PredictTrader]: {
            isInitialFunded: true,
            isProfileWarningDisplayed: false,
          },
        },
      });

      await waitFor(() => {
        const ctx = parseContext(container);
        expect(ctx.isPearlWalletRefillRequired).toBe(true);
      });
    });

    it('is false when refill required but isInitialFunded is false', async () => {
      mockGetAllBalancesAndFundingRequirements.mockResolvedValue({
        [DEFAULT_SERVICE_CONFIG_ID]: makeBalancesAndFundingRequirements({
          is_refill_required: true,
        }),
      });

      const { container } = setup({
        services: [
          {
            ...makeService({
              service_config_id: DEFAULT_SERVICE_CONFIG_ID,
              service_public_id: SERVICE_PUBLIC_ID_MAP.TRADER,
              home_chain: MiddlewareChainMap.GNOSIS,
            }),
            deploymentStatus: MiddlewareDeploymentStatusMap.DEPLOYED,
          },
        ],
        storeState: {
          [AgentMap.PredictTrader]: {
            isInitialFunded: false,
            isProfileWarningDisplayed: false,
          },
        },
      });

      await waitFor(() => {
        const ctx = parseContext(container);
        expect(ctx.isPearlWalletRefillRequired).toBe(false);
      });
    });

    it('is false when is_refill_required is false even if isInitialFunded', async () => {
      mockGetAllBalancesAndFundingRequirements.mockResolvedValue({
        [DEFAULT_SERVICE_CONFIG_ID]: makeBalancesAndFundingRequirements({
          is_refill_required: false,
        }),
      });

      const { container } = setup({
        services: [
          {
            ...makeService({
              service_config_id: DEFAULT_SERVICE_CONFIG_ID,
              service_public_id: SERVICE_PUBLIC_ID_MAP.TRADER,
              home_chain: MiddlewareChainMap.GNOSIS,
            }),
            deploymentStatus: MiddlewareDeploymentStatusMap.DEPLOYED,
          },
        ],
        storeState: {
          [AgentMap.PredictTrader]: {
            isInitialFunded: true,
            isProfileWarningDisplayed: false,
          },
        },
      });

      await waitFor(() => {
        const ctx = parseContext(container);
        expect(ctx.isPearlWalletRefillRequired).toBe(false);
      });
    });
  });

  describe('query enablement', () => {
    it('does NOT fetch when user is not logged in', async () => {
      const { container } = setup({ isUserLoggedIn: false });

      await waitFor(() => {
        const ctx = parseContext(container);
        expect(ctx.isBalancesAndFundingRequirementsLoading).toBe(false);
      });
      expect(mockGetBalancesAndFundingRequirements).not.toHaveBeenCalled();
    });

    it('does NOT fetch when offline', async () => {
      const { container } = setup({ isOnline: false });

      await waitFor(() => {
        const ctx = parseContext(container);
        expect(ctx.isBalancesAndFundingRequirementsLoading).toBe(false);
      });
      expect(mockGetBalancesAndFundingRequirements).not.toHaveBeenCalled();
    });

    it('does NOT fetch when no configId and queries are disabled', async () => {
      // When selectedService is undefined and user is not logged in,
      // both queries should be fully disabled.
      const { container } = setup({
        selectedService: undefined,
        isUserLoggedIn: false,
        availableServiceConfigIds: [],
      });

      await waitFor(() => {
        const ctx = parseContext(container);
        expect(ctx.isBalancesAndFundingRequirementsLoading).toBe(false);
      });
      expect(mockGetBalancesAndFundingRequirements).not.toHaveBeenCalled();
      expect(mockGetAllBalancesAndFundingRequirements).not.toHaveBeenCalled();
    });

    it('fetches when online, logged in, and configId is present', async () => {
      const { container } = setup();
      await waitFor(() => {
        const ctx = parseContext(container);
        expect(ctx.isBalancesAndFundingRequirementsLoading).toBe(false);
      });
      expect(mockGetBalancesAndFundingRequirements).toHaveBeenCalled();
    });
  });

  describe('allowStartAgentByServiceConfigId', () => {
    it('returns false when serviceConfigId is undefined', async () => {
      const FnConsumer = () => {
        const ctx = useContext(BalancesAndRefillRequirementsProviderContext);
        return (
          <div data-testid="fn-result">
            {JSON.stringify(ctx.allowStartAgentByServiceConfigId(undefined))}
          </div>
        );
      };

      const { container } = setupWithConsumer(FnConsumer);

      await waitFor(() => {
        expect(mockGetAllBalancesAndFundingRequirements).toHaveBeenCalled();
      });

      const text = container.querySelector(
        '[data-testid="fn-result"]',
      )?.textContent;
      expect(text).toBe('false');
    });

    it('returns true when allow_start_agent is true for the given config', async () => {
      mockGetAllBalancesAndFundingRequirements.mockResolvedValue({
        [DEFAULT_SERVICE_CONFIG_ID]: makeBalancesAndFundingRequirements({
          allow_start_agent: true,
        }),
      });

      const FnConsumer = () => {
        const ctx = useContext(BalancesAndRefillRequirementsProviderContext);
        return (
          <div data-testid="fn-result">
            {JSON.stringify(
              ctx.allowStartAgentByServiceConfigId(DEFAULT_SERVICE_CONFIG_ID),
            )}
          </div>
        );
      };

      const { container } = setupWithConsumer(FnConsumer);

      await waitFor(() => {
        const text = container.querySelector(
          '[data-testid="fn-result"]',
        )?.textContent;
        expect(text).toBe('true');
      });
    });

    it('returns false when allow_start_agent is false for the given config', async () => {
      mockGetAllBalancesAndFundingRequirements.mockResolvedValue({
        [DEFAULT_SERVICE_CONFIG_ID]: makeBalancesAndFundingRequirements({
          allow_start_agent: false,
        }),
      });

      const FnConsumer = () => {
        const ctx = useContext(BalancesAndRefillRequirementsProviderContext);
        return (
          <div data-testid="fn-result">
            {JSON.stringify(
              ctx.allowStartAgentByServiceConfigId(DEFAULT_SERVICE_CONFIG_ID),
            )}
          </div>
        );
      };

      const { container } = setupWithConsumer(FnConsumer);

      await waitFor(() => {
        const text = container.querySelector(
          '[data-testid="fn-result"]',
        )?.textContent;
        expect(text).toBe('false');
      });
    });
  });

  describe('hasBalancesForServiceConfigId', () => {
    it('returns true when data exists for the config', async () => {
      mockGetAllBalancesAndFundingRequirements.mockResolvedValue({
        [DEFAULT_SERVICE_CONFIG_ID]: makeBalancesAndFundingRequirements(),
      });

      const FnConsumer = () => {
        const ctx = useContext(BalancesAndRefillRequirementsProviderContext);
        return (
          <div data-testid="fn-result">
            {JSON.stringify(
              ctx.hasBalancesForServiceConfigId(DEFAULT_SERVICE_CONFIG_ID),
            )}
          </div>
        );
      };

      const { container } = setupWithConsumer(FnConsumer);

      await waitFor(() => {
        const text = container.querySelector(
          '[data-testid="fn-result"]',
        )?.textContent;
        expect(text).toBe('true');
      });
    });

    it('returns false when configId is not in the data', async () => {
      mockGetAllBalancesAndFundingRequirements.mockResolvedValue({
        [DEFAULT_SERVICE_CONFIG_ID]: makeBalancesAndFundingRequirements(),
      });

      const FnConsumer = () => {
        const ctx = useContext(BalancesAndRefillRequirementsProviderContext);
        return (
          <div data-testid="fn-result">
            {JSON.stringify(
              ctx.hasBalancesForServiceConfigId(MOCK_SERVICE_CONFIG_ID_2),
            )}
          </div>
        );
      };

      const { container } = setupWithConsumer(FnConsumer);

      await waitFor(() => {
        const text = container.querySelector(
          '[data-testid="fn-result"]',
        )?.textContent;
        expect(text).toBe('false');
      });
    });

    it('returns false when serviceConfigId is undefined', async () => {
      const FnConsumer = () => {
        const ctx = useContext(BalancesAndRefillRequirementsProviderContext);
        return (
          <div data-testid="fn-result">
            {JSON.stringify(ctx.hasBalancesForServiceConfigId(undefined))}
          </div>
        );
      };

      const { container } = setupWithConsumer(FnConsumer);

      await waitFor(() => {
        expect(mockGetAllBalancesAndFundingRequirements).toHaveBeenCalled();
      });

      const text = container.querySelector(
        '[data-testid="fn-result"]',
      )?.textContent;
      expect(text).toBe('false');
    });
  });

  describe('getRefillRequirementsOf', () => {
    it('returns requirements for the given chainId and configId', async () => {
      const expectedRequirements = {
        [DEFAULT_SAFE_ADDRESS]: {
          [AddressZero]: REFILL_NATIVE_WEI,
        },
      };
      mockGetAllBalancesAndFundingRequirements.mockResolvedValue({
        [DEFAULT_SERVICE_CONFIG_ID]: makeBalancesAndFundingRequirements({
          refill_requirements: { [gnosisChainKey]: expectedRequirements },
        }),
      });

      const FnConsumer = () => {
        const ctx = useContext(BalancesAndRefillRequirementsProviderContext);
        const result = ctx.getRefillRequirementsOf(
          EvmChainIdMap.Gnosis,
          DEFAULT_SERVICE_CONFIG_ID,
        );
        return <div data-testid="fn-result">{JSON.stringify(result)}</div>;
      };

      const { container } = setupWithConsumer(FnConsumer);

      await waitFor(() => {
        const text = container.querySelector(
          '[data-testid="fn-result"]',
        )?.textContent;
        expect(text).toBe(JSON.stringify(expectedRequirements));
      });
    });

    it('returns undefined when serviceConfigId is not provided', async () => {
      const FnConsumer = () => {
        const ctx = useContext(BalancesAndRefillRequirementsProviderContext);
        const result = ctx.getRefillRequirementsOf(EvmChainIdMap.Gnosis);
        return (
          <div data-testid="fn-result">
            {result === undefined ? 'undefined' : JSON.stringify(result)}
          </div>
        );
      };

      const { container } = setupWithConsumer(FnConsumer);

      await waitFor(() => {
        expect(mockGetAllBalancesAndFundingRequirements).toHaveBeenCalled();
      });

      const text = container.querySelector(
        '[data-testid="fn-result"]',
      )?.textContent;
      expect(text).toBe('undefined');
    });

    it('returns undefined when configId is not found in all-services data', async () => {
      mockGetAllBalancesAndFundingRequirements.mockResolvedValue({
        [DEFAULT_SERVICE_CONFIG_ID]: makeBalancesAndFundingRequirements(),
      });

      const FnConsumer = () => {
        const ctx = useContext(BalancesAndRefillRequirementsProviderContext);
        const result = ctx.getRefillRequirementsOf(
          EvmChainIdMap.Gnosis,
          MOCK_SERVICE_CONFIG_ID_2,
        );
        return (
          <div data-testid="fn-result">
            {result === undefined ? 'undefined' : JSON.stringify(result)}
          </div>
        );
      };

      const { container } = setupWithConsumer(FnConsumer);

      await waitFor(() => {
        const text = container.querySelector(
          '[data-testid="fn-result"]',
        )?.textContent;
        expect(text).toBe('undefined');
      });
    });
  });

  describe('isBalancesAndFundingRequirementsReadyForAllServices', () => {
    it('is true when enabled and not loading', async () => {
      const { container } = setup();
      await waitFor(() => {
        const ctx = parseContext(container);
        expect(ctx.isBalancesAndFundingRequirementsReadyForAllServices).toBe(
          true,
        );
      });
    });

    it('is false when all-services query is disabled (no configIds)', async () => {
      const { container } = setup({ availableServiceConfigIds: [] });
      await waitFor(() => {
        const ctx = parseContext(container);
        expect(ctx.isBalancesAndFundingRequirementsReadyForAllServices).toBe(
          false,
        );
      });
    });
  });

  describe('resetQueryCache', () => {
    it('removes the selected service query from the cache', async () => {
      const queryClientRef = { current: null as QueryClient | null };

      const FnConsumer = () => {
        const ctx = useContext(BalancesAndRefillRequirementsProviderContext);
        const qc = useQueryClient();
        queryClientRef.current = qc;
        return (
          <button
            data-testid="reset-btn"
            onClick={() => ctx.resetQueryCache()}
          />
        );
      };

      const { container } = setupWithConsumer(FnConsumer);

      // Wait for query to resolve
      await waitFor(() => {
        expect(mockGetBalancesAndFundingRequirements).toHaveBeenCalled();
      });

      // Verify query cache has data before reset
      const queryKey = [
        'balancesAndRefillRequirements',
        DEFAULT_SERVICE_CONFIG_ID,
      ];
      expect(queryClientRef.current!.getQueryData(queryKey)).toBeDefined();

      // Click reset
      const btn = container.querySelector('[data-testid="reset-btn"]');
      act(() => {
        btn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      // After reset, the cache entry should be removed
      await waitFor(() => {
        expect(queryClientRef.current!.getQueryData(queryKey)).toBeUndefined();
      });
    });
  });

  describe('refetch', () => {
    it('refetches both selected and all-services queries', async () => {
      let refetchFn: (() => Promise<unknown>) | null = null;

      const FnConsumer = () => {
        const ctx = useContext(BalancesAndRefillRequirementsProviderContext);
        refetchFn = ctx.refetch;
        return <div data-testid="fn-result">ready</div>;
      };

      setupWithConsumer(FnConsumer);

      // Wait for initial queries
      await waitFor(() => {
        expect(mockGetBalancesAndFundingRequirements).toHaveBeenCalledTimes(1);
        expect(mockGetAllBalancesAndFundingRequirements).toHaveBeenCalledTimes(
          1,
        );
      });

      // Call refetch
      await act(async () => {
        await refetchFn!();
      });

      // Both queries should have been called again
      expect(mockGetBalancesAndFundingRequirements).toHaveBeenCalledTimes(2);
      expect(mockGetAllBalancesAndFundingRequirements).toHaveBeenCalledTimes(2);
    });
  });
});
