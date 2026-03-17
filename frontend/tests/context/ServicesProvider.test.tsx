import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { message } from 'antd';
import { act, createElement, PropsWithChildren, useContext } from 'react';

import { AGENT_CONFIG } from '../../config/agents';
import { AgentMap, AgentType } from '../../constants/agent';
import { EvmChainIdMap, MiddlewareChainMap } from '../../constants/chains';
import { MiddlewareDeploymentStatusMap } from '../../constants/deployment';
import { PAGES } from '../../constants/pages';
import { WALLET_OWNER, WALLET_TYPE } from '../../constants/wallet';
import { OnlineStatusContext } from '../../context/OnlineStatusProvider';
import {
  ServicesContext,
  ServicesProvider,
} from '../../context/ServicesProvider';
import {
  MiddlewareServiceResponse,
  ServiceValidationResponse,
} from '../../types';
import {
  DEFAULT_SERVICE_CONFIG_ID,
  makeAgentService,
  makeChainConfig,
  MOCK_INSTANCE_ADDRESS,
  MOCK_MULTISIG_ADDRESS,
  MOCK_SERVICE_CONFIG_ID_2,
  MOCK_SERVICE_CONFIG_ID_3,
  MOCK_SERVICE_CONFIG_ID_4,
} from '../helpers/factories';
import { createTestQueryClient } from '../helpers/queryClient';

// ── Module mocks ──────────────────────────────────────────────────────

// ethers-multicall + providers must be mocked to break circular deps
/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../constants/providers', () => ({}));
jest.mock('../../config/providers', () => ({}));

// ServicesService
const mockGetServices = jest.fn<
  Promise<MiddlewareServiceResponse[]>,
  [AbortSignal?]
>();
const mockGetServicesValidationStatus = jest.fn<
  Promise<ServiceValidationResponse>,
  [AbortSignal?]
>();
const mockGetDeployment = jest.fn();

jest.mock('../../service/Services', () => ({
  ServicesService: {
    getServices: (...args: unknown[]) =>
      mockGetServices(args[0] as AbortSignal),
    getServicesValidationStatus: (...args: unknown[]) =>
      mockGetServicesValidationStatus(args[0] as AbortSignal),
    getDeployment: (...args: unknown[]) => mockGetDeployment(args[0]),
  },
}));

// Hooks
const mockStoreSet = jest.fn();
const mockElectronApi = { store: { set: mockStoreSet } };
jest.mock('../../hooks/useElectronApi', () => ({
  useElectronApi: () => mockElectronApi,
}));

let mockStoreState: Record<string, unknown> | undefined = {};
jest.mock('../../hooks/useStore', () => ({
  useStore: () => ({ storeState: mockStoreState }),
}));

let mockPageState: string = PAGES.Setup;
jest.mock('../../hooks/usePageState', () => ({
  usePageState: () => ({ pageState: mockPageState }),
}));

jest.mock('../../hooks/usePause', () => ({
  usePause: () => ({
    paused: false,
    setPaused: jest.fn(),
    togglePaused: jest.fn(),
  }),
}));

jest.mock('../../hooks/useDynamicRefetchInterval', () => ({
  useDynamicRefetchInterval: <T,>(interval: T): T => interval,
}));

// Suppress antd message calls — spy on them
jest.spyOn(message, 'error').mockImplementation(() => ({}) as never);

// ── Helpers ───────────────────────────────────────────────────────────

/** Shorthand: builds a MiddlewareServiceResponse for the given agent type. */
const serviceFor = (
  agentType: AgentType = AgentMap.PredictTrader,
  overrides: Partial<MiddlewareServiceResponse> = {},
) => makeAgentService(AGENT_CONFIG[agentType], overrides);

type WrapperOpts = { isOnline?: boolean };

const createWrapper = ({ isOnline = true }: WrapperOpts = {}) => {
  const queryClient = createTestQueryClient();
  function Wrapper({ children }: PropsWithChildren) {
    return createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(
        OnlineStatusContext.Provider,
        { value: { isOnline } },
        createElement(ServicesProvider, null, children),
      ),
    );
  }
  return Wrapper;
};

// ── Tests ──────────────────────────────────────────────────────────────

describe('ServicesProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStoreState = {};
    mockPageState = PAGES.Setup;
    mockGetServices.mockResolvedValue([]);
    mockGetServicesValidationStatus.mockResolvedValue({});
    mockGetDeployment.mockResolvedValue({
      status: MiddlewareDeploymentStatusMap.STOPPED,
      nodes: { agent: [], tendermint: [] },
      healthcheck: {},
    });
  });

  describe('default context values', () => {
    it('provides default selectedAgentType as PredictTrader', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useContext(ServicesContext), {
        wrapper,
      });

      expect(result.current.selectedAgentType).toBe(AgentMap.PredictTrader);
    });

    it('provides default selectedAgentConfig matching PredictTrader', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useContext(ServicesContext), {
        wrapper,
      });

      expect(result.current.selectedAgentConfig).toBe(
        AGENT_CONFIG[AgentMap.PredictTrader],
      );
    });

    it('provides empty availableServiceConfigIds when services are empty', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useContext(ServicesContext), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.availableServiceConfigIds).toEqual([]);
      });
    });
  });

  // ─── Agent type selection ───────────────────────────────────────────

  describe('instance selection', () => {
    it('syncs selectedServiceConfigId from store on mount', async () => {
      const optimusService = serviceFor(AgentMap.Optimus, {
        service_config_id: MOCK_SERVICE_CONFIG_ID_2,
      });
      mockGetServices.mockResolvedValue([optimusService]);
      mockStoreState = {
        lastSelectedServiceConfigId: MOCK_SERVICE_CONFIG_ID_2,
      };

      const wrapper = createWrapper();
      const { result } = renderHook(() => useContext(ServicesContext), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.selectedServiceConfigId).toBe(
          MOCK_SERVICE_CONFIG_ID_2,
        );
        expect(result.current.selectedAgentType).toBe(AgentMap.Optimus);
      });
    });

    it('migrates from lastSelectedAgentType when lastSelectedServiceConfigId is empty', async () => {
      const optimusService = serviceFor(AgentMap.Optimus, {
        service_config_id: MOCK_SERVICE_CONFIG_ID_2,
      });
      mockGetServices.mockResolvedValue([optimusService]);
      mockStoreState = { lastSelectedAgentType: AgentMap.Optimus };

      const wrapper = createWrapper();
      const { result } = renderHook(() => useContext(ServicesContext), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.selectedServiceConfigId).toBe(
          MOCK_SERVICE_CONFIG_ID_2,
        );
        expect(result.current.selectedAgentType).toBe(AgentMap.Optimus);
      });

      // Should persist the migration
      expect(mockStoreSet).toHaveBeenCalledWith(
        'lastSelectedServiceConfigId',
        MOCK_SERVICE_CONFIG_ID_2,
      );
    });

    it('syncs selectedServiceConfigId when store loads after mount', async () => {
      const optimusService = serviceFor(AgentMap.Optimus, {
        service_config_id: MOCK_SERVICE_CONFIG_ID_2,
      });
      mockGetServices.mockResolvedValue([optimusService]);
      mockStoreState = {};

      const wrapper = createWrapper();
      const { result, rerender } = renderHook(
        () => useContext(ServicesContext),
        { wrapper },
      );

      // Wait for services to load — fallback selects first service
      await waitFor(() => {
        expect(result.current.services).toEqual([optimusService]);
      });

      // Store value arrives later
      mockStoreState = {
        lastSelectedServiceConfigId: MOCK_SERVICE_CONFIG_ID_2,
      };
      rerender();

      await waitFor(() => {
        expect(result.current.selectedServiceConfigId).toBe(
          MOCK_SERVICE_CONFIG_ID_2,
        );
      });
    });

    it('does not re-sync selectedServiceConfigId after initial store sync', async () => {
      const traderService = serviceFor(AgentMap.PredictTrader);
      mockGetServices.mockResolvedValue([traderService]);
      mockStoreState = {
        lastSelectedServiceConfigId: DEFAULT_SERVICE_CONFIG_ID,
      };

      const wrapper = createWrapper();
      const { result, rerender } = renderHook(
        () => useContext(ServicesContext),
        { wrapper },
      );

      await waitFor(() => {
        expect(result.current.selectedServiceConfigId).toBe(
          DEFAULT_SERVICE_CONFIG_ID,
        );
      });

      // Store changes after mount, but the ref guard prevents re-sync
      mockStoreState = {
        lastSelectedServiceConfigId: MOCK_SERVICE_CONFIG_ID_4,
      };
      rerender();

      // selectedServiceConfigId stays at the initial value (one-time sync only)
      expect(result.current.selectedServiceConfigId).toBe(
        DEFAULT_SERVICE_CONFIG_ID,
      );
    });

    it('updateAgentType selects first instance of that type and writes to store', async () => {
      const agentsFunService = serviceFor(AgentMap.AgentsFun, {
        service_config_id: MOCK_SERVICE_CONFIG_ID_3,
      });
      mockGetServices.mockResolvedValue([agentsFunService]);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useContext(ServicesContext), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.services).toEqual([agentsFunService]);
      });

      act(() => {
        result.current.updateAgentType(AgentMap.AgentsFun);
      });

      expect(mockStoreSet).toHaveBeenCalledWith(
        'lastSelectedServiceConfigId',
        MOCK_SERVICE_CONFIG_ID_3,
      );
      expect(result.current.selectedAgentType).toBe(AgentMap.AgentsFun);
    });

    it('updateSelectedInstance writes to store and updates selection', async () => {
      const traderService = serviceFor(AgentMap.PredictTrader);
      mockGetServices.mockResolvedValue([traderService]);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useContext(ServicesContext), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.services).toBeDefined();
      });

      act(() => {
        result.current.updateSelectedInstance(DEFAULT_SERVICE_CONFIG_ID);
      });

      expect(mockStoreSet).toHaveBeenCalledWith(
        'lastSelectedServiceConfigId',
        DEFAULT_SERVICE_CONFIG_ID,
      );
      expect(result.current.selectedServiceConfigId).toBe(
        DEFAULT_SERVICE_CONFIG_ID,
      );
    });

    it('switches between instances of the same type without changing selectedAgentType', async () => {
      const instance1 = serviceFor(AgentMap.PredictTrader, {
        service_config_id: DEFAULT_SERVICE_CONFIG_ID,
      });
      const instance2 = serviceFor(AgentMap.PredictTrader, {
        service_config_id: MOCK_SERVICE_CONFIG_ID_2,
      });
      mockGetServices.mockResolvedValue([instance1, instance2]);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useContext(ServicesContext), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.services).toHaveLength(2);
      });

      // Select instance 2
      act(() => {
        result.current.updateSelectedInstance(MOCK_SERVICE_CONFIG_ID_2);
      });

      expect(result.current.selectedServiceConfigId).toBe(
        MOCK_SERVICE_CONFIG_ID_2,
      );
      expect(result.current.selectedAgentType).toBe(AgentMap.PredictTrader);

      // Switch back to instance 1
      act(() => {
        result.current.updateSelectedInstance(DEFAULT_SERVICE_CONFIG_ID);
      });

      expect(result.current.selectedServiceConfigId).toBe(
        DEFAULT_SERVICE_CONFIG_ID,
      );
      expect(result.current.selectedAgentType).toBe(AgentMap.PredictTrader);
    });
  });

  describe('updateAgentType', () => {
    it('is a no-op when no instances exist', async () => {
      mockGetServices.mockResolvedValue([]);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useContext(ServicesContext), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isFetched).toBe(true);
      });

      act(() => {
        result.current.updateAgentType(AgentMap.Optimus);
      });

      // No instances, so selectedAgentType stays as default
      expect(result.current.selectedAgentType).toBe(AgentMap.PredictTrader);
    });
  });

  describe('selectAgentTypeForSetup', () => {
    it('sets pendingAgentType and nulls selectedServiceConfigId', async () => {
      const traderService = serviceFor(AgentMap.PredictTrader);
      mockGetServices.mockResolvedValue([traderService]);
      mockStoreState = {
        lastSelectedServiceConfigId: DEFAULT_SERVICE_CONFIG_ID,
      };

      const wrapper = createWrapper();
      const { result } = renderHook(() => useContext(ServicesContext), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.selectedServiceConfigId).toBe(
          DEFAULT_SERVICE_CONFIG_ID,
        );
      });

      act(() => {
        result.current.selectAgentTypeForSetup(AgentMap.Optimus);
      });

      expect(result.current.selectedAgentType).toBe(AgentMap.Optimus);
      expect(result.current.selectedServiceConfigId).toBeNull();
    });

    it('works even when instances of the type already exist', async () => {
      const optimusService = serviceFor(AgentMap.Optimus, {
        service_config_id: MOCK_SERVICE_CONFIG_ID_2,
      });
      mockGetServices.mockResolvedValue([optimusService]);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useContext(ServicesContext), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.services).toHaveLength(1);
      });

      act(() => {
        result.current.selectAgentTypeForSetup(AgentMap.Optimus);
      });

      // selectedServiceConfigId is null (not the existing instance)
      expect(result.current.selectedServiceConfigId).toBeNull();
      expect(result.current.selectedAgentType).toBe(AgentMap.Optimus);
    });
  });

  // ─── Service fetching ──────────────────────────────────────────────

  describe('service fetching', () => {
    it('fetches services when online', async () => {
      const traderService = serviceFor(AgentMap.PredictTrader);
      mockGetServices.mockResolvedValue([traderService]);

      const wrapper = createWrapper({ isOnline: true });
      const { result } = renderHook(() => useContext(ServicesContext), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.services).toEqual([traderService]);
      });

      expect(mockGetServices).toHaveBeenCalled();
    });

    it('does not fetch services when offline', async () => {
      const wrapper = createWrapper({ isOnline: false });
      renderHook(() => useContext(ServicesContext), { wrapper });

      // Give enough time for potential fetch
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      expect(mockGetServices).not.toHaveBeenCalled();
    });

    it('sets isFetched to true after services load', async () => {
      mockGetServices.mockResolvedValue([]);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useContext(ServicesContext), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isFetched).toBe(true);
      });
    });
  });

  // ─── Service selection ─────────────────────────────────────────────

  describe('service selection', () => {
    it('auto-selects service matching selectedAgentConfig', async () => {
      const traderService = serviceFor(AgentMap.PredictTrader);
      mockGetServices.mockResolvedValue([traderService]);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useContext(ServicesContext), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.selectedService).toBeDefined();
        expect(result.current.selectedService?.service_config_id).toBe(
          DEFAULT_SERVICE_CONFIG_ID,
        );
      });
    });

    it('falls back to first available service when no stored selection exists', async () => {
      // Return a service that doesn't match PredictTrader
      const optimusService = serviceFor(AgentMap.Optimus);
      mockGetServices.mockResolvedValue([optimusService]);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useContext(ServicesContext), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.services).toEqual([optimusService]);
      });

      // Fallback: selects the first available service
      await waitFor(() => {
        expect(result.current.selectedService).toBeDefined();
        expect(result.current.selectedService?.service_config_id).toBe(
          optimusService.service_config_id,
        );
        expect(result.current.selectedAgentType).toBe(AgentMap.Optimus);
      });
    });

    it('selects correct service when multiple services exist', async () => {
      const traderService = serviceFor(AgentMap.PredictTrader, {
        service_config_id: DEFAULT_SERVICE_CONFIG_ID,
      });
      const optimusService = serviceFor(AgentMap.Optimus, {
        service_config_id: MOCK_SERVICE_CONFIG_ID_2,
      });

      mockGetServices.mockResolvedValue([traderService, optimusService]);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useContext(ServicesContext), {
        wrapper,
      });

      // Default agent type is PredictTrader
      await waitFor(() => {
        expect(result.current.selectedService?.service_config_id).toBe(
          DEFAULT_SERVICE_CONFIG_ID,
        );
      });
    });
  });

  // ─── Service wallets ───────────────────────────────────────────────

  describe('serviceWallets', () => {
    it('derives EOA wallets from chain_configs instances', async () => {
      const traderService = serviceFor(AgentMap.PredictTrader);
      mockGetServices.mockResolvedValue([traderService]);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useContext(ServicesContext), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.serviceWallets).toBeDefined();
        expect(result.current.serviceWallets).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              address: MOCK_INSTANCE_ADDRESS,
              type: WALLET_TYPE.EOA,
              owner: WALLET_OWNER.Agent,
            }),
          ]),
        );
      });
    });

    it('derives Safe wallets from chain_configs multisig', async () => {
      const traderService = serviceFor(AgentMap.PredictTrader);
      mockGetServices.mockResolvedValue([traderService]);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useContext(ServicesContext), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.serviceWallets).toBeDefined();
        expect(result.current.serviceWallets).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              address: MOCK_MULTISIG_ADDRESS,
              type: WALLET_TYPE.Safe,
              owner: WALLET_OWNER.Agent,
              evmChainId: EvmChainIdMap.Gnosis,
            }),
          ]),
        );
      });
    });

    it('returns both EOA and Safe wallets from a single service', async () => {
      const traderService = serviceFor(AgentMap.PredictTrader);
      mockGetServices.mockResolvedValue([traderService]);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useContext(ServicesContext), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.serviceWallets).toHaveLength(2);
      });
    });

    it('returns empty array when services exist but have no chain data', async () => {
      const emptyService = serviceFor(AgentMap.PredictTrader, {
        chain_configs: makeChainConfig(MiddlewareChainMap.GNOSIS, {
          instances: undefined,
          multisig: undefined,
        }),
      });
      mockGetServices.mockResolvedValue([emptyService]);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useContext(ServicesContext), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.serviceWallets).toBeDefined();
        expect(result.current.serviceWallets).toEqual([]);
      });
    });

    it('returns empty array when services are empty', async () => {
      mockGetServices.mockResolvedValue([]);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useContext(ServicesContext), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.serviceWallets).toEqual([]);
      });
    });
  });

  // ─── Available service config IDs ──────────────────────────────────

  describe('availableServiceConfigIds', () => {
    it('includes enabled, non-under-construction agents', async () => {
      // PredictTrader is enabled and not under construction
      const traderService = serviceFor(AgentMap.PredictTrader, {
        service_config_id: 'sc-trader',
      });
      mockGetServices.mockResolvedValue([traderService]);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useContext(ServicesContext), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.availableServiceConfigIds).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ configId: 'sc-trader' }),
          ]),
        );
      });
    });

    it('excludes under-construction agents (Modius)', async () => {
      // Modius has isUnderConstruction: true
      const modiusService = serviceFor(AgentMap.Modius, {
        service_config_id: 'sc-modius',
      });
      mockGetServices.mockResolvedValue([modiusService]);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useContext(ServicesContext), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.services).toEqual([modiusService]);
      });

      const modiusEntry = result.current.availableServiceConfigIds.find(
        (e) => e.configId === 'sc-modius',
      );
      expect(modiusEntry).toBeUndefined();
    });

    it('extracts tokenId and chainId correctly', async () => {
      const traderService = serviceFor(AgentMap.PredictTrader, {
        service_config_id: 'sc-trader',
        chain_configs: makeChainConfig(MiddlewareChainMap.GNOSIS, {
          token: 99,
        }),
      });
      mockGetServices.mockResolvedValue([traderService]);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useContext(ServicesContext), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.availableServiceConfigIds).toEqual([
          {
            configId: 'sc-trader',
            tokenId: 99,
            chainId: EvmChainIdMap.Gnosis,
          },
        ]);
      });
    });
  });

  // ─── getServiceConfigIdsOf ─────────────────────────────────────────

  describe('getServiceConfigIdsOf', () => {
    it('returns config IDs for the specified chain', async () => {
      const traderService = serviceFor(AgentMap.PredictTrader, {
        service_config_id: 'sc-gnosis',
      });
      mockGetServices.mockResolvedValue([traderService]);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useContext(ServicesContext), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.availableServiceConfigIds.length).toBeGreaterThan(
          0,
        );
      });

      expect(
        result.current.getServiceConfigIdsOf(EvmChainIdMap.Gnosis),
      ).toEqual(['sc-gnosis']);
    });

    it('returns empty array for a chain with no services', async () => {
      const traderService = serviceFor(AgentMap.PredictTrader, {
        service_config_id: 'sc-gnosis',
      });
      mockGetServices.mockResolvedValue([traderService]);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useContext(ServicesContext), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.availableServiceConfigIds.length).toBeGreaterThan(
          0,
        );
      });

      expect(result.current.getServiceConfigIdsOf(EvmChainIdMap.Base)).toEqual(
        [],
      );
    });
  });

  // ─── Status overrides ─────────────────────────────────────────────

  describe('overrideSelectedServiceStatus', () => {
    it('overrides the selected service deployment status', async () => {
      const traderService = serviceFor(AgentMap.PredictTrader);
      mockGetServices.mockResolvedValue([traderService]);
      mockGetDeployment.mockResolvedValue({
        status: MiddlewareDeploymentStatusMap.STOPPED,
        nodes: { agent: [], tendermint: [] },
        healthcheck: {},
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useContext(ServicesContext), {
        wrapper,
      });

      // Wait for service to be selected
      await waitFor(() => {
        expect(result.current.selectedService).toBeDefined();
      });

      act(() => {
        result.current.overrideSelectedServiceStatus(
          MiddlewareDeploymentStatusMap.DEPLOYING,
        );
      });

      await waitFor(() => {
        expect(result.current.selectedService?.deploymentStatus).toBe(
          MiddlewareDeploymentStatusMap.DEPLOYING,
        );
      });
    });

    it('clears override when set to undefined', async () => {
      const traderService = serviceFor(AgentMap.PredictTrader);
      mockGetServices.mockResolvedValue([traderService]);
      mockGetDeployment.mockResolvedValue({
        status: MiddlewareDeploymentStatusMap.DEPLOYED,
        nodes: { agent: [], tendermint: [] },
        healthcheck: {},
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useContext(ServicesContext), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.selectedService).toBeDefined();
      });

      // Set override
      act(() => {
        result.current.overrideSelectedServiceStatus(
          MiddlewareDeploymentStatusMap.STOPPING,
        );
      });

      await waitFor(() => {
        expect(result.current.selectedService?.deploymentStatus).toBe(
          MiddlewareDeploymentStatusMap.STOPPING,
        );
      });

      // Clear override
      act(() => {
        result.current.overrideSelectedServiceStatus(undefined);
      });

      await waitFor(() => {
        // Falls back to deploymentDetails status
        expect(result.current.selectedService?.deploymentStatus).toBe(
          MiddlewareDeploymentStatusMap.DEPLOYED,
        );
      });
    });
  });

  // ─── Service validation ────────────────────────────────────────────

  describe('service validation', () => {
    it('shows error toast when validation is invalid on Main page', async () => {
      mockPageState = PAGES.Main;
      mockGetServices.mockResolvedValue([]);
      mockGetServicesValidationStatus.mockResolvedValue({
        'sc-invalid': false,
      });

      const wrapper = createWrapper();
      renderHook(() => useContext(ServicesContext), { wrapper });

      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            key: 'service-error',
          }),
        );
      });
    });

    it('does not show error toast when all services are valid', async () => {
      mockPageState = PAGES.Main;
      mockGetServices.mockResolvedValue([]);
      mockGetServicesValidationStatus.mockResolvedValue({
        'sc-valid': true,
      });

      const wrapper = createWrapper();
      renderHook(() => useContext(ServicesContext), { wrapper });

      await waitFor(() => {
        expect(mockGetServicesValidationStatus).toHaveBeenCalled();
      });

      expect(message.error).not.toHaveBeenCalled();
    });

    it('does not show error toast on non-Main pages', async () => {
      mockPageState = PAGES.Setup;
      mockGetServices.mockResolvedValue([]);
      mockGetServicesValidationStatus.mockResolvedValue({
        'sc-invalid': false,
      });

      const wrapper = createWrapper();
      renderHook(() => useContext(ServicesContext), { wrapper });

      await waitFor(() => {
        expect(mockGetServicesValidationStatus).toHaveBeenCalled();
      });

      expect(message.error).not.toHaveBeenCalled();
    });
  });

  // ─── Agent name ────────────────────────────────────────────────────

  describe('agent name', () => {
    it('returns null for selectedAgentName when no service is selected', async () => {
      mockGetServices.mockResolvedValue([]);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useContext(ServicesContext), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isFetched).toBe(true);
      });

      expect(result.current.selectedAgentName).toBeNull();
    });

    it('falls back to display name in selectedAgentNameOrFallback', async () => {
      mockGetServices.mockResolvedValue([]);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useContext(ServicesContext), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isFetched).toBe(true);
      });

      const config = AGENT_CONFIG[AgentMap.PredictTrader];
      expect(result.current.selectedAgentNameOrFallback).toBe(
        `My ${config.displayName}`,
      );
    });

    it('generates a name when service has a valid token', async () => {
      const traderService = serviceFor(AgentMap.PredictTrader);
      mockGetServices.mockResolvedValue([traderService]);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useContext(ServicesContext), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.selectedService).toBeDefined();
      });

      // selectedAgentName should be non-null when token is valid
      await waitFor(() => {
        expect(result.current.selectedAgentName).not.toBeNull();
        expect(typeof result.current.selectedAgentName).toBe('string');
      });
    });

    it('returns null for selectedAgentName when token is invalid (0)', async () => {
      const traderService = serviceFor(AgentMap.PredictTrader, {
        chain_configs: makeChainConfig(MiddlewareChainMap.GNOSIS, { token: 0 }),
      });
      mockGetServices.mockResolvedValue([traderService]);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useContext(ServicesContext), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.selectedService).toBeDefined();
      });

      expect(result.current.selectedAgentName).toBeNull();
    });
  });

  // ─── getAgentTypeFromService ───────────────────────────────────────

  describe('getAgentTypeFromService', () => {
    it('returns agent type for a known service config id', async () => {
      const traderService = serviceFor(AgentMap.PredictTrader, {
        service_config_id: 'sc-known-trader',
      });
      mockGetServices.mockResolvedValue([traderService]);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useContext(ServicesContext), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.services).toHaveLength(1);
      });

      expect(result.current.getAgentTypeFromService('sc-known-trader')).toBe(
        AgentMap.PredictTrader,
      );
    });

    it('returns null for undefined serviceConfigId', async () => {
      mockGetServices.mockResolvedValue([]);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useContext(ServicesContext), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isFetched).toBe(true);
      });

      expect(result.current.getAgentTypeFromService(undefined)).toBeNull();
    });

    it('returns null for an unknown service config id', async () => {
      mockGetServices.mockResolvedValue([]);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useContext(ServicesContext), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isFetched).toBe(true);
      });

      expect(result.current.getAgentTypeFromService('sc-unknown')).toBeNull();
    });

    it('matches agent type by service_public_id via ACTIVE_AGENTS', async () => {
      // Test with Optimus
      const optimusService = serviceFor(AgentMap.Optimus, {
        service_config_id: MOCK_SERVICE_CONFIG_ID_3,
      });
      mockGetServices.mockResolvedValue([optimusService]);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useContext(ServicesContext), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.services).toHaveLength(1);
      });

      expect(
        result.current.getAgentTypeFromService(MOCK_SERVICE_CONFIG_ID_3),
      ).toBe(AgentMap.Optimus);
    });

    it('disambiguates Optimus and Modius despite shared servicePublicId', async () => {
      // Optimus and Modius share servicePublicId ('valory/optimus:0.1.0')
      // but differ on home_chain (OPTIMISM vs MODE)
      const optimusService = serviceFor(AgentMap.Optimus, {
        service_config_id: MOCK_SERVICE_CONFIG_ID_2,
      });
      const modiusService = serviceFor(AgentMap.Modius, {
        service_config_id: MOCK_SERVICE_CONFIG_ID_3,
      });
      mockGetServices.mockResolvedValue([optimusService, modiusService]);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useContext(ServicesContext), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.services).toHaveLength(2);
      });

      expect(
        result.current.getAgentTypeFromService(MOCK_SERVICE_CONFIG_ID_2),
      ).toBe(AgentMap.Optimus);
      expect(
        result.current.getAgentTypeFromService(MOCK_SERVICE_CONFIG_ID_3),
      ).toBe(AgentMap.Modius);
    });
  });

  // ─── getServiceConfigIdFromAgentType ───────────────────────────────

  describe('getServiceConfigIdFromAgentType', () => {
    it('returns config ID for a matching agent type', async () => {
      const traderService = serviceFor(AgentMap.PredictTrader, {
        service_config_id: 'sc-trader-reverse',
      });
      mockGetServices.mockResolvedValue([traderService]);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useContext(ServicesContext), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.availableServiceConfigIds.length).toBeGreaterThan(
          0,
        );
      });

      expect(
        result.current.getServiceConfigIdFromAgentType(AgentMap.PredictTrader),
      ).toBe('sc-trader-reverse');
    });

    it('returns null when no service matches the agent type', async () => {
      mockGetServices.mockResolvedValue([]);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useContext(ServicesContext), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isFetched).toBe(true);
      });

      expect(
        result.current.getServiceConfigIdFromAgentType(AgentMap.PredictTrader),
      ).toBeNull();
    });
  });

  // ─── Deployment details ────────────────────────────────────────────

  describe('deploymentDetails', () => {
    it('fetches deployment when a service is selected', async () => {
      const traderService = serviceFor(AgentMap.PredictTrader);
      mockGetServices.mockResolvedValue([traderService]);
      const mockDeployment = {
        status: MiddlewareDeploymentStatusMap.DEPLOYED,
        nodes: { agent: [], tendermint: [] },
        healthcheck: {},
      };
      mockGetDeployment.mockResolvedValue(mockDeployment);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useContext(ServicesContext), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.deploymentDetails).toBeDefined();
        expect(result.current.deploymentDetails?.status).toBe(
          MiddlewareDeploymentStatusMap.DEPLOYED,
        );
      });
    });

    it('uses fast refetch interval for transitioning deployment status', async () => {
      const traderService = serviceFor(AgentMap.PredictTrader);
      mockGetServices.mockResolvedValue([traderService]);
      mockGetDeployment.mockResolvedValue({
        status: MiddlewareDeploymentStatusMap.DEPLOYING,
        nodes: { agent: [], tendermint: [] },
        healthcheck: {},
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useContext(ServicesContext), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.deploymentDetails).toBeDefined();
        expect(result.current.deploymentDetails?.status).toBe(
          MiddlewareDeploymentStatusMap.DEPLOYING,
        );
      });

      // The refetchInterval callback is invoked by react-query and should
      // return the fast interval for transitioning statuses (DEPLOYING).
      // We verify the deployment was fetched with the transitioning status.
      expect(mockGetDeployment).toHaveBeenCalled();
    });

    it('does not fetch deployment when no services exist', async () => {
      mockGetServices.mockResolvedValue([]);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useContext(ServicesContext), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isFetched).toBe(true);
      });

      // Give time for potential deployment fetch
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      // Should not call getDeployment since no service exists
      expect(result.current.selectedService).toBeUndefined();
      expect(mockGetDeployment).not.toHaveBeenCalled();
    });
  });

  // ─── selectedService includes status override ─────────────────────

  describe('selectedServiceWithStatus', () => {
    it('merges deployment status from deploymentDetails', async () => {
      const traderService = serviceFor(AgentMap.PredictTrader);
      mockGetServices.mockResolvedValue([traderService]);
      mockGetDeployment.mockResolvedValue({
        status: MiddlewareDeploymentStatusMap.DEPLOYED,
        nodes: { agent: [], tendermint: [] },
        healthcheck: {},
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useContext(ServicesContext), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.selectedService?.deploymentStatus).toBe(
          MiddlewareDeploymentStatusMap.DEPLOYED,
        );
      });
    });

    it('prefers status override over deploymentDetails', async () => {
      const traderService = serviceFor(AgentMap.PredictTrader);
      mockGetServices.mockResolvedValue([traderService]);
      mockGetDeployment.mockResolvedValue({
        status: MiddlewareDeploymentStatusMap.DEPLOYED,
        nodes: { agent: [], tendermint: [] },
        healthcheck: {},
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useContext(ServicesContext), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.selectedService).toBeDefined();
      });

      act(() => {
        result.current.overrideSelectedServiceStatus(
          MiddlewareDeploymentStatusMap.STOPPING,
        );
      });

      await waitFor(() => {
        expect(result.current.selectedService?.deploymentStatus).toBe(
          MiddlewareDeploymentStatusMap.STOPPING,
        );
      });
    });
  });

  // ─── isInitialFunded migration effect ───────────────────────────────

  describe('isInitialFunded migration', () => {
    it('migrates legacy boolean isInitialFunded to per-service record', async () => {
      const traderService = serviceFor(AgentMap.PredictTrader);
      mockGetServices.mockResolvedValue([traderService]);
      mockStoreState = {
        [AgentMap.PredictTrader]: { isInitialFunded: true },
      };

      const wrapper = createWrapper();
      renderHook(() => useContext(ServicesContext), { wrapper });

      await waitFor(() => {
        expect(mockStoreSet).toHaveBeenCalledWith(
          `${AgentMap.PredictTrader}.isInitialFunded`,
          { [DEFAULT_SERVICE_CONFIG_ID]: true },
        );
      });
    });

    it('does not migrate when isInitialFunded is already a record', async () => {
      const traderService = serviceFor(AgentMap.PredictTrader);
      mockGetServices.mockResolvedValue([traderService]);
      mockStoreState = {
        [AgentMap.PredictTrader]: {
          isInitialFunded: { [DEFAULT_SERVICE_CONFIG_ID]: true },
        },
      };

      const wrapper = createWrapper();
      renderHook(() => useContext(ServicesContext), { wrapper });

      await waitFor(() => {
        // Wait for services to load
        expect(mockGetServices).toHaveBeenCalled();
      });

      // Give time for potential migration
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      // Should not write isInitialFunded (only lastSelectedServiceConfigId from selection)
      const isInitialFundedCalls = mockStoreSet.mock.calls.filter(
        ([key]: [string]) => key.includes('isInitialFunded'),
      );
      expect(isInitialFundedCalls).toHaveLength(0);
    });
  });

  // ─── Multiple agents in availableServiceConfigIds ─────────────────

  describe('multiple agents', () => {
    it('includes multiple enabled agents in availableServiceConfigIds', async () => {
      const traderService = serviceFor(AgentMap.PredictTrader, {
        service_config_id: 'sc-trader',
      });
      const optimusService = serviceFor(AgentMap.Optimus, {
        service_config_id: 'sc-optimus',
      });
      const agentsFunService = serviceFor(AgentMap.AgentsFun, {
        service_config_id: 'sc-agentsfun',
      });
      mockGetServices.mockResolvedValue([
        traderService,
        optimusService,
        agentsFunService,
      ]);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useContext(ServicesContext), {
        wrapper,
      });

      await waitFor(() => {
        const configIds = result.current.availableServiceConfigIds.map(
          (x) => x.configId,
        );
        expect(configIds).toContain('sc-trader');
        expect(configIds).toContain('sc-optimus');
        expect(configIds).toContain('sc-agentsfun');
      });
    });
  });

  // ─── getInstancesOfAgentType ──────────────────────────────────────

  describe('getInstancesOfAgentType', () => {
    it('returns matching services for a given agent type', async () => {
      const traderService1 = serviceFor(AgentMap.PredictTrader, {
        service_config_id: DEFAULT_SERVICE_CONFIG_ID,
      });
      const traderService2 = serviceFor(AgentMap.PredictTrader, {
        service_config_id: MOCK_SERVICE_CONFIG_ID_2,
      });
      const optimusService = serviceFor(AgentMap.Optimus, {
        service_config_id: MOCK_SERVICE_CONFIG_ID_3,
      });
      mockGetServices.mockResolvedValue([
        traderService1,
        traderService2,
        optimusService,
      ]);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useContext(ServicesContext), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.services).toHaveLength(3);
      });

      const traderInstances = result.current.getInstancesOfAgentType(
        AgentMap.PredictTrader,
      );
      expect(traderInstances).toHaveLength(2);
      expect(traderInstances.map((s) => s.service_config_id)).toEqual([
        DEFAULT_SERVICE_CONFIG_ID,
        MOCK_SERVICE_CONFIG_ID_2,
      ]);
    });

    it('returns empty array when no services match', async () => {
      const traderService = serviceFor(AgentMap.PredictTrader);
      mockGetServices.mockResolvedValue([traderService]);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useContext(ServicesContext), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.services).toHaveLength(1);
      });

      expect(result.current.getInstancesOfAgentType(AgentMap.Optimus)).toEqual(
        [],
      );
    });

    it('returns empty array when services are not loaded', async () => {
      mockGetServices.mockResolvedValue([]);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useContext(ServicesContext), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isFetched).toBe(true);
      });

      expect(
        result.current.getInstancesOfAgentType(AgentMap.PredictTrader),
      ).toEqual([]);
    });
  });
});
