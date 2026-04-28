import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { act, PropsWithChildren, useContext } from 'react';

import { AGENT_CONFIG } from '../../../config/agents';
import { TokenSymbolMap } from '../../../config/tokens';
import { AgentMap } from '../../../constants/agent';
import { EvmChainId, EvmChainIdMap } from '../../../constants/chains';
import { AgentWallet, MasterWallet } from '../../../constants/wallet';
import {
  BalanceContext,
  BalanceProvider,
} from '../../../context/BalanceProvider/BalanceProvider';
import { MasterWalletContext } from '../../../context/MasterWalletProvider';
import { OnlineStatusContext } from '../../../context/OnlineStatusProvider';
import { ServicesContext } from '../../../context/ServicesProvider';
import { AgentConfig } from '../../../types/Agent';
import {
  CrossChainStakedBalances,
  WalletBalance,
} from '../../../types/Balance';
import { MiddlewareServiceResponse } from '../../../types/Service';
import {
  DEFAULT_EOA_ADDRESS,
  DEFAULT_SAFE_ADDRESS,
  DEFAULT_SERVICE_CONFIG_ID,
  makeMasterEoa,
  makeMasterSafe,
  makeService,
  MOCK_MULTISIG_ADDRESS,
  SECOND_SAFE_ADDRESS,
} from '../../helpers/factories';
import { createTestQueryClient } from '../../helpers/queryClient';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../../mocks/ethersMulticall').ethersMulticallMock,
);
jest.mock('../../../constants/providers', () => ({}));
/* eslint-enable @typescript-eslint/no-var-requires */

const mockGetCrossChainBalances = jest.fn();
jest.mock('../../../context/BalanceProvider/utils', () => ({
  getCrossChainBalances: (...args: unknown[]) =>
    mockGetCrossChainBalances(...args),
}));

const defaultAgentConfig: AgentConfig = AGENT_CONFIG[AgentMap.PredictTrader];

const defaultMasterWallets: MasterWallet[] = [
  makeMasterEoa(),
  makeMasterSafe(EvmChainIdMap.Gnosis),
];

const defaultService: MiddlewareServiceResponse =
  makeService() as unknown as MiddlewareServiceResponse;

const makeWalletBalance = (
  overrides: Partial<WalletBalance> = {},
): WalletBalance => ({
  walletAddress: DEFAULT_EOA_ADDRESS,
  evmChainId: EvmChainIdMap.Gnosis,
  symbol: TokenSymbolMap.XDAI,
  isNative: true,
  balance: 1.5,
  ...overrides,
});

const makeStakedBalance = (
  overrides: Partial<CrossChainStakedBalances[number]> = {},
): CrossChainStakedBalances[number] => ({
  serviceId: DEFAULT_SERVICE_CONFIG_ID,
  evmChainId: EvmChainIdMap.Gnosis,
  olasBondBalance: 10,
  olasDepositBalance: 20,
  walletAddress: MOCK_MULTISIG_ADDRESS,
  ...overrides,
});

type WrapperOptions = {
  isOnline?: boolean;
  masterWallets?: MasterWallet[] | null;
  services?: MiddlewareServiceResponse[] | null;
  selectedAgentConfig?: AgentConfig;
};

const createWrapper = (options: WrapperOptions = {}) => {
  const { isOnline = true, selectedAgentConfig = defaultAgentConfig } = options;
  const masterWallets =
    options.masterWallets === null
      ? undefined
      : (options.masterWallets ?? defaultMasterWallets);
  const services =
    options.services === null
      ? undefined
      : (options.services ?? [defaultService]);

  const queryClient = createTestQueryClient();

  // eslint-disable-next-line react/display-name
  return ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>
      <OnlineStatusContext.Provider value={{ isOnline }}>
        <MasterWalletContext.Provider value={{ masterWallets }}>
          <ServicesContext.Provider
            value={{
              services,
              selectedAgentConfig,
              serviceWallets: undefined as AgentWallet[] | undefined,
              availableServiceConfigIds: [],
              getServiceConfigIdsOf: () => [],
              getAgentTypeFromService: () => null,
              getServiceConfigIdFromAgentType: () => null,
              getInstancesOfAgentType: () => [],
              isSelectedServiceDeploymentStatusLoading: false,
              selectedAgentType: AgentMap.PredictTrader,
              selectedAgentName: null,
              selectedAgentNameOrFallback: 'My agent',
              selectedServiceConfigId: null,
              deploymentDetails: undefined,
              updateAgentType: jest.fn(),
              selectAgentTypeForSetup: jest.fn(),
              updateSelectedServiceConfigId: jest.fn(),
              overrideSelectedServiceStatus: jest.fn(),
              paused: false,
              setPaused: jest.fn(),
              togglePaused: jest.fn(),
            }}
          >
            <BalanceProvider>{children}</BalanceProvider>
          </ServicesContext.Provider>
        </MasterWalletContext.Provider>
      </OnlineStatusContext.Provider>
    </QueryClientProvider>
  );
};

describe('BalanceProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('default context values (no provider)', () => {
    it('returns defaults when no BalanceProvider wraps the consumer', () => {
      const { result } = renderHook(() => useContext(BalanceContext));

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isLoaded).toBe(false);
      expect(result.current.isPaused).toBe(false);
      expect(result.current.walletBalances).toBeUndefined();
      expect(result.current.stakedBalances).toBeUndefined();
      expect(result.current.totalOlasBalance).toBeUndefined();
      expect(result.current.totalEthBalance).toBeUndefined();
      expect(result.current.totalStakedOlasBalance).toBeUndefined();
      expect(result.current.getStakedOlasBalanceOf(DEFAULT_EOA_ADDRESS)).toBe(
        0,
      );
      expect(
        result.current.getStakedOlasBalanceByServiceId(DEFAULT_SERVICE_CONFIG_ID),
      ).toBe(0);
    });
  });

  describe('query enablement', () => {
    it('does NOT fetch when offline', async () => {
      mockGetCrossChainBalances.mockResolvedValue({
        walletBalances: [],
        stakedBalances: [],
      });

      const { result } = renderHook(() => useContext(BalanceContext), {
        wrapper: createWrapper({ isOnline: false }),
      });

      // Give the query client time to run (it should not)
      await new Promise((r) => setTimeout(r, 50));
      expect(mockGetCrossChainBalances).not.toHaveBeenCalled();
      expect(result.current.isLoaded).toBe(false);
    });

    it('does NOT fetch when masterWallets is empty', async () => {
      mockGetCrossChainBalances.mockResolvedValue({
        walletBalances: [],
        stakedBalances: [],
      });

      renderHook(() => useContext(BalanceContext), {
        wrapper: createWrapper({ masterWallets: [] }),
      });

      await new Promise((r) => setTimeout(r, 50));
      expect(mockGetCrossChainBalances).not.toHaveBeenCalled();
    });

    it('does NOT fetch when masterWallets is undefined', async () => {
      mockGetCrossChainBalances.mockResolvedValue({
        walletBalances: [],
        stakedBalances: [],
      });

      renderHook(() => useContext(BalanceContext), {
        wrapper: createWrapper({ masterWallets: null }),
      });

      await new Promise((r) => setTimeout(r, 50));
      expect(mockGetCrossChainBalances).not.toHaveBeenCalled();
    });

    it('does NOT fetch when services is undefined', async () => {
      mockGetCrossChainBalances.mockResolvedValue({
        walletBalances: [],
        stakedBalances: [],
      });

      renderHook(() => useContext(BalanceContext), {
        wrapper: createWrapper({ services: null }),
      });

      await new Promise((r) => setTimeout(r, 50));
      expect(mockGetCrossChainBalances).not.toHaveBeenCalled();
    });

    it('fetches when online, masterWallets has items, and services is defined', async () => {
      mockGetCrossChainBalances.mockResolvedValue({
        walletBalances: [],
        stakedBalances: [],
      });

      const { result } = renderHook(() => useContext(BalanceContext), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });
      expect(mockGetCrossChainBalances).toHaveBeenCalledTimes(1);
    });
  });

  describe('derived values', () => {
    it('sets walletBalances from data', async () => {
      const balances = [makeWalletBalance()];
      mockGetCrossChainBalances.mockResolvedValue({
        walletBalances: balances,
        stakedBalances: [],
      });

      const { result } = renderHook(() => useContext(BalanceContext), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });
      expect(result.current.walletBalances).toEqual(balances);
    });

    it('defaults walletBalances to empty array when data has no walletBalances', async () => {
      mockGetCrossChainBalances.mockResolvedValue({
        walletBalances: undefined,
        stakedBalances: undefined,
      });

      const { result } = renderHook(() => useContext(BalanceContext), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });
      expect(result.current.walletBalances).toEqual([]);
    });

    it('sets stakedBalances from data', async () => {
      const staked = [makeStakedBalance()];
      mockGetCrossChainBalances.mockResolvedValue({
        walletBalances: [],
        stakedBalances: staked,
      });

      const { result } = renderHook(() => useContext(BalanceContext), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });
      // `stakedBalances` is not directly exposed by the context; the provider
      // derives `totalStakedOlasBalance` from it (sum of olasBondBalance +
      // olasDepositBalance for all entries on the agent's home chain).
      // makeStakedBalance() uses Gnosis (PredictTrader's home chain) with
      // olasBondBalance=10 and olasDepositBalance=20, so we expect 30.
      expect(result.current.totalStakedOlasBalance).toBe(30);
    });

    describe('totalEthBalance', () => {
      it('sums only native balances', async () => {
        const walletBalances = [
          makeWalletBalance({ isNative: true, balance: 2.0 }),
          makeWalletBalance({
            isNative: false,
            balance: 100,
            symbol: TokenSymbolMap.OLAS,
          }),
          makeWalletBalance({
            isNative: true,
            balance: 3.5,
            walletAddress: DEFAULT_SAFE_ADDRESS,
          }),
        ];
        mockGetCrossChainBalances.mockResolvedValue({
          walletBalances,
          stakedBalances: [],
        });

        const { result } = renderHook(() => useContext(BalanceContext), {
          wrapper: createWrapper(),
        });

        await waitFor(() => {
          expect(result.current.isLoaded).toBe(true);
        });
        expect(result.current.totalEthBalance).toBe(5.5);
      });

      it('returns 0 when no native balances exist', async () => {
        const walletBalances = [
          makeWalletBalance({
            isNative: false,
            balance: 50,
            symbol: TokenSymbolMap.OLAS,
          }),
        ];
        mockGetCrossChainBalances.mockResolvedValue({
          walletBalances,
          stakedBalances: [],
        });

        const { result } = renderHook(() => useContext(BalanceContext), {
          wrapper: createWrapper(),
        });

        await waitFor(() => {
          expect(result.current.isLoaded).toBe(true);
        });
        expect(result.current.totalEthBalance).toBe(0);
      });
    });

    describe('totalOlasBalance', () => {
      it('sums only OLAS symbol balances', async () => {
        const walletBalances = [
          makeWalletBalance({
            isNative: false,
            balance: 25,
            symbol: TokenSymbolMap.OLAS,
          }),
          makeWalletBalance({
            isNative: true,
            balance: 10,
            symbol: TokenSymbolMap.XDAI,
          }),
          makeWalletBalance({
            isNative: false,
            balance: 75,
            symbol: TokenSymbolMap.OLAS,
            walletAddress: DEFAULT_SAFE_ADDRESS,
          }),
        ];
        mockGetCrossChainBalances.mockResolvedValue({
          walletBalances,
          stakedBalances: [],
        });

        const { result } = renderHook(() => useContext(BalanceContext), {
          wrapper: createWrapper(),
        });

        await waitFor(() => {
          expect(result.current.isLoaded).toBe(true);
        });
        expect(result.current.totalOlasBalance).toBe(100);
      });

      it('returns 0 when no OLAS balances exist', async () => {
        const walletBalances = [
          makeWalletBalance({
            isNative: true,
            balance: 5,
            symbol: TokenSymbolMap.XDAI,
          }),
        ];
        mockGetCrossChainBalances.mockResolvedValue({
          walletBalances,
          stakedBalances: [],
        });

        const { result } = renderHook(() => useContext(BalanceContext), {
          wrapper: createWrapper(),
        });

        await waitFor(() => {
          expect(result.current.isLoaded).toBe(true);
        });
        expect(result.current.totalOlasBalance).toBe(0);
      });
    });

    describe('totalStakedOlasBalance', () => {
      it('sums bond + deposit for the selectedAgentConfig home chain', async () => {
        const stakedBalances = [
          makeStakedBalance({
            evmChainId: EvmChainIdMap.Gnosis,
            olasBondBalance: 10,
            olasDepositBalance: 20,
          }),
          makeStakedBalance({
            evmChainId: EvmChainIdMap.Gnosis,
            olasBondBalance: 5,
            olasDepositBalance: 15,
          }),
        ];
        mockGetCrossChainBalances.mockResolvedValue({
          walletBalances: [],
          stakedBalances,
        });

        const { result } = renderHook(() => useContext(BalanceContext), {
          wrapper: createWrapper({
            selectedAgentConfig: {
              ...defaultAgentConfig,
              evmHomeChainId: EvmChainIdMap.Gnosis,
            },
          }),
        });

        await waitFor(() => {
          expect(result.current.isLoaded).toBe(true);
        });
        // (10+20) + (5+15) = 50
        expect(result.current.totalStakedOlasBalance).toBe(50);
      });

      it('excludes staked balances from other chains', async () => {
        const stakedBalances = [
          makeStakedBalance({
            evmChainId: EvmChainIdMap.Gnosis,
            olasBondBalance: 10,
            olasDepositBalance: 20,
          }),
          makeStakedBalance({
            evmChainId: EvmChainIdMap.Base,
            olasBondBalance: 100,
            olasDepositBalance: 200,
          }),
        ];
        mockGetCrossChainBalances.mockResolvedValue({
          walletBalances: [],
          stakedBalances,
        });

        const { result } = renderHook(() => useContext(BalanceContext), {
          wrapper: createWrapper({
            selectedAgentConfig: {
              ...defaultAgentConfig,
              evmHomeChainId: EvmChainIdMap.Gnosis,
            },
          }),
        });

        await waitFor(() => {
          expect(result.current.isLoaded).toBe(true);
        });
        // Only Gnosis: 10+20 = 30
        expect(result.current.totalStakedOlasBalance).toBe(30);
      });

      it('returns undefined when selectedAgentConfig has no evmHomeChainId', async () => {
        mockGetCrossChainBalances.mockResolvedValue({
          walletBalances: [],
          stakedBalances: [makeStakedBalance()],
        });

        const { result } = renderHook(() => useContext(BalanceContext), {
          wrapper: createWrapper({
            selectedAgentConfig: {
              ...defaultAgentConfig,
              evmHomeChainId: undefined as unknown as EvmChainId,
            },
          }),
        });

        await waitFor(() => {
          expect(result.current.isLoaded).toBe(true);
        });
        expect(result.current.totalStakedOlasBalance).toBeUndefined();
      });

      it('returns 0 when no staked balances exist on the home chain', async () => {
        mockGetCrossChainBalances.mockResolvedValue({
          walletBalances: [],
          stakedBalances: [
            makeStakedBalance({
              evmChainId: EvmChainIdMap.Base,
              olasBondBalance: 50,
              olasDepositBalance: 50,
            }),
          ],
        });

        const { result } = renderHook(() => useContext(BalanceContext), {
          wrapper: createWrapper({
            selectedAgentConfig: {
              ...defaultAgentConfig,
              evmHomeChainId: EvmChainIdMap.Gnosis,
            },
          }),
        });

        await waitFor(() => {
          expect(result.current.isLoaded).toBe(true);
        });
        expect(result.current.totalStakedOlasBalance).toBe(0);
      });
    });
  });

  describe('getStakedOlasBalanceOf', () => {
    it('returns sum of bond + deposit for matching wallet address', async () => {
      const stakedBalances = [
        makeStakedBalance({
          walletAddress: MOCK_MULTISIG_ADDRESS,
          olasBondBalance: 10,
          olasDepositBalance: 20,
        }),
        makeStakedBalance({
          walletAddress: MOCK_MULTISIG_ADDRESS,
          olasBondBalance: 5,
          olasDepositBalance: 15,
          evmChainId: EvmChainIdMap.Base,
        }),
      ];
      mockGetCrossChainBalances.mockResolvedValue({
        walletBalances: [],
        stakedBalances,
      });

      const { result } = renderHook(() => useContext(BalanceContext), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });
      // (10+20) + (5+15) = 50
      expect(result.current.getStakedOlasBalanceOf(MOCK_MULTISIG_ADDRESS)).toBe(
        50,
      );
    });

    it('returns 0 when no staked balances match the wallet address', async () => {
      const stakedBalances = [
        makeStakedBalance({ walletAddress: MOCK_MULTISIG_ADDRESS }),
      ];
      mockGetCrossChainBalances.mockResolvedValue({
        walletBalances: [],
        stakedBalances,
      });

      const { result } = renderHook(() => useContext(BalanceContext), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });
      expect(result.current.getStakedOlasBalanceOf(SECOND_SAFE_ADDRESS)).toBe(
        0,
      );
    });

    it('performs case-insensitive address matching', async () => {
      const stakedBalances = [
        makeStakedBalance({
          walletAddress: MOCK_MULTISIG_ADDRESS.toLowerCase() as `0x${string}`,
          olasBondBalance: 7,
          olasDepositBalance: 3,
        }),
      ];
      mockGetCrossChainBalances.mockResolvedValue({
        walletBalances: [],
        stakedBalances,
      });

      const { result } = renderHook(() => useContext(BalanceContext), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });
      // Should match regardless of casing
      expect(
        result.current.getStakedOlasBalanceOf(
          MOCK_MULTISIG_ADDRESS.toUpperCase() as `0x${string}`,
        ),
      ).toBe(10);
    });

    it('returns 0 for empty address', async () => {
      mockGetCrossChainBalances.mockResolvedValue({
        walletBalances: [],
        stakedBalances: [makeStakedBalance()],
      });

      const { result } = renderHook(() => useContext(BalanceContext), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });
      expect(result.current.getStakedOlasBalanceOf('' as `0x${string}`)).toBe(
        0,
      );
    });
  });

  describe('getStakedOlasBalanceByServiceId', () => {
    it('returns 0 for undefined serviceId', async () => {
      mockGetCrossChainBalances.mockResolvedValue({
        walletBalances: [],
        stakedBalances: [makeStakedBalance()],
      });

      const { result } = renderHook(() => useContext(BalanceContext), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });
      expect(result.current.getStakedOlasBalanceByServiceId(undefined)).toBe(0);
    });

    it('returns sum of bond + deposit for matching serviceId', async () => {
      const stakedBalances = [
        makeStakedBalance({
          serviceId: DEFAULT_SERVICE_CONFIG_ID,
          olasBondBalance: 10,
          olasDepositBalance: 20,
        }),
      ];
      mockGetCrossChainBalances.mockResolvedValue({
        walletBalances: [],
        stakedBalances,
      });

      const { result } = renderHook(() => useContext(BalanceContext), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });
      expect(
        result.current.getStakedOlasBalanceByServiceId(DEFAULT_SERVICE_CONFIG_ID),
      ).toBe(30);
    });

    it('excludes sibling service on same chain', async () => {
      const SIBLING_SERVICE_CONFIG_ID = 'sc-sibling-11223344-5566-7788-99aa';
      const stakedBalances = [
        makeStakedBalance({
          serviceId: DEFAULT_SERVICE_CONFIG_ID,
          evmChainId: EvmChainIdMap.Gnosis,
          olasBondBalance: 10,
          olasDepositBalance: 20,
        }),
        makeStakedBalance({
          serviceId: SIBLING_SERVICE_CONFIG_ID,
          evmChainId: EvmChainIdMap.Gnosis,
          olasBondBalance: 100,
          olasDepositBalance: 200,
        }),
      ];
      mockGetCrossChainBalances.mockResolvedValue({
        walletBalances: [],
        stakedBalances,
      });

      const { result } = renderHook(() => useContext(BalanceContext), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });
      // Only the target service's balance: 10+20 = 30
      expect(
        result.current.getStakedOlasBalanceByServiceId(DEFAULT_SERVICE_CONFIG_ID),
      ).toBe(30);
      // Sibling independently returns its own balance: 100+200 = 300
      expect(
        result.current.getStakedOlasBalanceByServiceId(SIBLING_SERVICE_CONFIG_ID),
      ).toBe(300);
    });

    it('returns same value as totalStakedOlasBalance when only one service is on chain', async () => {
      const stakedBalances = [
        makeStakedBalance({
          serviceId: DEFAULT_SERVICE_CONFIG_ID,
          evmChainId: EvmChainIdMap.Gnosis,
          olasBondBalance: 15,
          olasDepositBalance: 25,
        }),
      ];
      mockGetCrossChainBalances.mockResolvedValue({
        walletBalances: [],
        stakedBalances,
      });

      const { result } = renderHook(() => useContext(BalanceContext), {
        wrapper: createWrapper({
          selectedAgentConfig: {
            ...defaultAgentConfig,
            evmHomeChainId: EvmChainIdMap.Gnosis,
          },
        }),
      });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });
      // Single service: per-service sum equals chain-wide sum
      expect(
        result.current.getStakedOlasBalanceByServiceId(DEFAULT_SERVICE_CONFIG_ID),
      ).toBe(40);
      expect(result.current.totalStakedOlasBalance).toBe(40);
    });
  });

  describe('isLoaded', () => {
    it('is true after data is successfully fetched', async () => {
      mockGetCrossChainBalances.mockResolvedValue({
        walletBalances: [],
        stakedBalances: [],
      });

      const { result } = renderHook(() => useContext(BalanceContext), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoaded).toBe(false);
      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });
    });

    it('remains false when query is disabled', async () => {
      mockGetCrossChainBalances.mockResolvedValue({
        walletBalances: [],
        stakedBalances: [],
      });

      const { result } = renderHook(() => useContext(BalanceContext), {
        wrapper: createWrapper({ isOnline: false }),
      });

      await new Promise((r) => setTimeout(r, 50));
      expect(result.current.isLoaded).toBe(false);
    });
  });

  describe('updateBalances', () => {
    it('triggers a refetch of balances', async () => {
      const firstBalances = [makeWalletBalance({ balance: 1.0 })];
      const secondBalances = [makeWalletBalance({ balance: 2.0 })];

      mockGetCrossChainBalances
        .mockResolvedValueOnce({
          walletBalances: firstBalances,
          stakedBalances: [],
        })
        .mockResolvedValueOnce({
          walletBalances: secondBalances,
          stakedBalances: [],
        });

      const { result } = renderHook(() => useContext(BalanceContext), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });
      expect(result.current.walletBalances).toEqual(firstBalances);

      await act(async () => {
        await result.current.updateBalances();
      });

      await waitFor(() => {
        expect(result.current.walletBalances).toEqual(secondBalances);
      });
    });
  });

  describe('isPaused / setIsPaused', () => {
    it('defaults to false', async () => {
      mockGetCrossChainBalances.mockResolvedValue({
        walletBalances: [],
        stakedBalances: [],
      });

      const { result } = renderHook(() => useContext(BalanceContext), {
        wrapper: createWrapper(),
      });

      expect(result.current.isPaused).toBe(false);
    });

    it('toggles pause state via setIsPaused', async () => {
      mockGetCrossChainBalances.mockResolvedValue({
        walletBalances: [],
        stakedBalances: [],
      });

      const { result } = renderHook(() => useContext(BalanceContext), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      act(() => {
        result.current.setIsPaused(true);
      });

      expect(result.current.isPaused).toBe(true);

      act(() => {
        result.current.setIsPaused(false);
      });

      expect(result.current.isPaused).toBe(false);
    });
  });

  describe('refetchInterval behavior', () => {
    it('refetches when not paused', async () => {
      mockGetCrossChainBalances.mockResolvedValue({
        walletBalances: [],
        stakedBalances: [],
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useContext(BalanceContext), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      // isPaused defaults to false, so refetching should have been called
      expect(mockGetCrossChainBalances).toHaveBeenCalled();
    });

    it('stops refetching when paused', async () => {
      mockGetCrossChainBalances.mockResolvedValue({
        walletBalances: [],
        stakedBalances: [],
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useContext(BalanceContext), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      const callCountBeforePause = mockGetCrossChainBalances.mock.calls.length;

      act(() => {
        result.current.setIsPaused(true);
      });

      expect(result.current.isPaused).toBe(true);

      // After pausing, no additional calls should happen
      // (refetchInterval becomes false when isPaused is true)
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      expect(mockGetCrossChainBalances.mock.calls.length).toBe(
        callCountBeforePause,
      );
    });
  });

  describe('getCrossChainBalances call arguments', () => {
    it('passes services, masterWallets, and serviceWallets to getCrossChainBalances', async () => {
      mockGetCrossChainBalances.mockResolvedValue({
        walletBalances: [],
        stakedBalances: [],
      });

      const services = [defaultService];
      const wallets = defaultMasterWallets;

      const { result } = renderHook(() => useContext(BalanceContext), {
        wrapper: createWrapper({ services, masterWallets: wallets }),
      });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      expect(mockGetCrossChainBalances).toHaveBeenCalledWith({
        services,
        masterWallets: wallets,
        serviceWallets: undefined,
      });
    });
  });

  describe('empty data handling', () => {
    it('returns 0 totalEthBalance and 0 totalOlasBalance with empty walletBalances', async () => {
      mockGetCrossChainBalances.mockResolvedValue({
        walletBalances: [],
        stakedBalances: [],
      });

      const { result } = renderHook(() => useContext(BalanceContext), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });
      expect(result.current.totalEthBalance).toBe(0);
      expect(result.current.totalOlasBalance).toBe(0);
    });
  });
});
