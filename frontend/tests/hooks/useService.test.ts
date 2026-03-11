import { renderHook } from '@testing-library/react';

import { AGENT_CONFIG } from '../../config/agents';
import { AgentMap, AgentType } from '../../constants/agent';
import { EvmChainIdMap, MiddlewareChainMap } from '../../constants/chains';
import { MiddlewareDeploymentStatusMap } from '../../constants/deployment';
import { WALLET_OWNER, WALLET_TYPE } from '../../constants/wallet';
import { useService } from '../../hooks/useService';
import { useServices } from '../../hooks/useServices';
import { Service } from '../../types/Service';
import {
  DEFAULT_SERVICE_CONFIG_ID,
  makeChainConfig,
  makeService,
  MOCK_INSTANCE_ADDRESS,
  MOCK_MULTISIG_ADDRESS,
  MOCK_SERVICE_CONFIG_ID_2,
} from '../helpers/factories';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../constants/providers', () => ({}));
jest.mock('../../hooks/useServices', () => ({
  useServices: jest.fn(),
}));

const mockUseServices = useServices as jest.Mock;

/** Helper: builds a service with populated chain_configs */
const makeFullService = (overrides: Partial<Service> = {}): Service =>
  makeService({
    home_chain: MiddlewareChainMap.GNOSIS,
    chain_configs: makeChainConfig(MiddlewareChainMap.GNOSIS),
    ...overrides,
  });

const setupMock = ({
  services,
  selectedService,
  isFetched = true,
}: {
  services?: Service[];
  selectedService?: Service;
  isFetched?: boolean;
}) => {
  mockUseServices.mockReturnValue({
    services,
    selectedService,
    isFetched,
  });
};

describe('useService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------
  // 1. Service lookup
  // -------------------------------------------------------------------
  describe('service lookup', () => {
    it('returns selectedService when configId matches selectedService', () => {
      const selected = makeFullService();
      setupMock({ services: [selected], selectedService: selected });

      const { result } = renderHook(() =>
        useService(DEFAULT_SERVICE_CONFIG_ID),
      );
      expect(result.current.service).toBe(selected);
    });

    it('searches services array when configId does not match selectedService', () => {
      const selected = makeFullService();
      const other = makeFullService({
        service_config_id: MOCK_SERVICE_CONFIG_ID_2,
      });
      setupMock({ services: [selected, other], selectedService: selected });

      const { result } = renderHook(() => useService(MOCK_SERVICE_CONFIG_ID_2));
      expect(result.current.service).toBe(other);
    });

    it('returns undefined when no service matches the configId', () => {
      const selected = makeFullService();
      setupMock({ services: [selected], selectedService: selected });

      const { result } = renderHook(() => useService('nonexistent-id'));
      expect(result.current.service).toBeUndefined();
    });

    it('returns undefined when no configId is provided', () => {
      const selected = makeFullService();
      setupMock({ services: [selected], selectedService: selected });

      const { result } = renderHook(() => useService(undefined));
      expect(result.current.service).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------
  // 2. deploymentStatus
  // -------------------------------------------------------------------
  describe('deploymentStatus', () => {
    it('returns deploymentStatus from service', () => {
      const svc = makeFullService({
        deploymentStatus: MiddlewareDeploymentStatusMap.DEPLOYED,
      });
      setupMock({ services: [svc], selectedService: svc });

      const { result } = renderHook(() =>
        useService(DEFAULT_SERVICE_CONFIG_ID),
      );
      expect(result.current.deploymentStatus).toBe(
        MiddlewareDeploymentStatusMap.DEPLOYED,
      );
    });

    it('returns undefined when service has no deploymentStatus', () => {
      const svc = makeFullService({ deploymentStatus: undefined });
      setupMock({ services: [svc], selectedService: svc });

      const { result } = renderHook(() =>
        useService(DEFAULT_SERVICE_CONFIG_ID),
      );
      expect(result.current.deploymentStatus).toBeUndefined();
    });

    it('returns undefined when no service found', () => {
      setupMock({ services: [], selectedService: undefined });

      const { result } = renderHook(() =>
        useService(DEFAULT_SERVICE_CONFIG_ID),
      );
      expect(result.current.deploymentStatus).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------
  // 3. serviceNftTokenId
  // -------------------------------------------------------------------
  describe('serviceNftTokenId', () => {
    it('returns token from chain_configs[home_chain].chain_data.token', () => {
      const svc = makeFullService();
      setupMock({ services: [svc], selectedService: svc });

      const { result } = renderHook(() =>
        useService(DEFAULT_SERVICE_CONFIG_ID),
      );
      expect(result.current.serviceNftTokenId).toBe(42);
    });

    it('returns undefined when chain_configs is empty', () => {
      const svc = makeFullService({ chain_configs: {} });
      setupMock({ services: [svc], selectedService: svc });

      const { result } = renderHook(() =>
        useService(DEFAULT_SERVICE_CONFIG_ID),
      );
      expect(result.current.serviceNftTokenId).toBeUndefined();
    });

    it('returns undefined when no service found', () => {
      setupMock({ services: [], selectedService: undefined });

      const { result } = renderHook(() =>
        useService(DEFAULT_SERVICE_CONFIG_ID),
      );
      expect(result.current.serviceNftTokenId).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------
  // 4. serviceWallets
  // -------------------------------------------------------------------
  describe('serviceWallets', () => {
    it('returns AgentEoa for instances and AgentSafe for multisig', () => {
      const svc = makeFullService();
      setupMock({ services: [svc], selectedService: svc });

      const { result } = renderHook(() =>
        useService(DEFAULT_SERVICE_CONFIG_ID),
      );

      expect(result.current.serviceWallets).toEqual([
        {
          address: MOCK_INSTANCE_ADDRESS,
          owner: WALLET_OWNER.Agent,
          type: WALLET_TYPE.EOA,
        },
        {
          address: MOCK_MULTISIG_ADDRESS,
          owner: WALLET_OWNER.Agent,
          type: WALLET_TYPE.Safe,
          evmChainId: EvmChainIdMap.Gnosis,
        },
      ]);
    });

    it('returns empty array when selectedService has no home_chain', () => {
      setupMock({ services: [], selectedService: undefined });

      const { result } = renderHook(() =>
        useService(DEFAULT_SERVICE_CONFIG_ID),
      );
      expect(result.current.serviceWallets).toEqual([]);
    });

    it('returns only AgentEoas when multisig is undefined', () => {
      const svc = makeFullService({
        chain_configs: makeChainConfig(MiddlewareChainMap.GNOSIS, {
          multisig: undefined,
        }),
      });
      setupMock({ services: [svc], selectedService: svc });

      const { result } = renderHook(() =>
        useService(DEFAULT_SERVICE_CONFIG_ID),
      );

      expect(result.current.serviceWallets).toEqual([
        {
          address: MOCK_INSTANCE_ADDRESS,
          owner: WALLET_OWNER.Agent,
          type: WALLET_TYPE.EOA,
        },
      ]);
    });

    it('returns only AgentSafe when instances is empty', () => {
      const svc = makeFullService({
        chain_configs: makeChainConfig(MiddlewareChainMap.GNOSIS, {
          instances: [],
        }),
      });
      setupMock({ services: [svc], selectedService: svc });

      const { result } = renderHook(() =>
        useService(DEFAULT_SERVICE_CONFIG_ID),
      );

      expect(result.current.serviceWallets).toEqual([
        {
          address: MOCK_MULTISIG_ADDRESS,
          owner: WALLET_OWNER.Agent,
          type: WALLET_TYPE.Safe,
          evmChainId: EvmChainIdMap.Gnosis,
        },
      ]);
    });
  });

  // -------------------------------------------------------------------
  // 5. serviceSafes and serviceEoa
  // -------------------------------------------------------------------
  describe('serviceSafes and serviceEoa', () => {
    it('serviceSafes contains only Safe wallets', () => {
      const svc = makeFullService();
      setupMock({ services: [svc], selectedService: svc });

      const { result } = renderHook(() =>
        useService(DEFAULT_SERVICE_CONFIG_ID),
      );

      expect(result.current.serviceSafes).toHaveLength(1);
      expect(result.current.serviceSafes[0]).toEqual({
        address: MOCK_MULTISIG_ADDRESS,
        owner: WALLET_OWNER.Agent,
        type: WALLET_TYPE.Safe,
        evmChainId: EvmChainIdMap.Gnosis,
      });
    });

    it('serviceEoa returns first EOA wallet', () => {
      const svc = makeFullService();
      setupMock({ services: [svc], selectedService: svc });

      const { result } = renderHook(() =>
        useService(DEFAULT_SERVICE_CONFIG_ID),
      );

      expect(result.current.serviceEoa).toEqual({
        address: MOCK_INSTANCE_ADDRESS,
        owner: WALLET_OWNER.Agent,
        type: WALLET_TYPE.EOA,
      });
    });

    it('serviceSafes is empty when no multisig exists', () => {
      const svc = makeFullService({
        chain_configs: makeChainConfig(MiddlewareChainMap.GNOSIS, {
          multisig: undefined,
        }),
      });
      setupMock({ services: [svc], selectedService: svc });

      const { result } = renderHook(() =>
        useService(DEFAULT_SERVICE_CONFIG_ID),
      );

      expect(result.current.serviceSafes).toEqual([]);
    });

    it('serviceEoa is undefined when instances is empty', () => {
      const svc = makeFullService({
        chain_configs: makeChainConfig(MiddlewareChainMap.GNOSIS, {
          instances: [],
        }),
      });
      setupMock({ services: [svc], selectedService: svc });

      const { result } = renderHook(() =>
        useService(DEFAULT_SERVICE_CONFIG_ID),
      );

      expect(result.current.serviceEoa).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------
  // 6. getServiceSafeOf
  // -------------------------------------------------------------------
  describe('getServiceSafeOf', () => {
    it('returns the safe for the given chainId and configId', () => {
      const svc = makeFullService();
      setupMock({ services: [svc], selectedService: svc });

      const { result } = renderHook(() =>
        useService(DEFAULT_SERVICE_CONFIG_ID),
      );

      const safe = result.current.getServiceSafeOf(
        EvmChainIdMap.Gnosis,
        DEFAULT_SERVICE_CONFIG_ID,
      );
      expect(safe).toEqual({
        address: MOCK_MULTISIG_ADDRESS,
        owner: WALLET_OWNER.Agent,
        type: WALLET_TYPE.Safe,
        evmChainId: EvmChainIdMap.Gnosis,
      });
    });

    it('returns undefined when configId is not provided', () => {
      const svc = makeFullService();
      setupMock({ services: [svc], selectedService: svc });

      const { result } = renderHook(() =>
        useService(DEFAULT_SERVICE_CONFIG_ID),
      );

      const safe = result.current.getServiceSafeOf(EvmChainIdMap.Gnosis);
      expect(safe).toBeUndefined();
    });

    it('returns undefined when no matching service found', () => {
      const svc = makeFullService();
      setupMock({ services: [svc], selectedService: svc });

      const { result } = renderHook(() =>
        useService(DEFAULT_SERVICE_CONFIG_ID),
      );

      const safe = result.current.getServiceSafeOf(
        EvmChainIdMap.Base,
        DEFAULT_SERVICE_CONFIG_ID,
      );
      expect(safe).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------
  // 7. getAgentTypeOf
  // -------------------------------------------------------------------
  describe('getAgentTypeOf', () => {
    it('returns agent type for a matching service', () => {
      const svc = makeFullService({
        service_public_id: AGENT_CONFIG[AgentMap.PredictTrader].servicePublicId,
        home_chain: MiddlewareChainMap.GNOSIS,
      });
      setupMock({ services: [svc], selectedService: svc });

      const { result } = renderHook(() =>
        useService(DEFAULT_SERVICE_CONFIG_ID),
      );

      const agentType = result.current.getAgentTypeOf(
        EvmChainIdMap.Gnosis,
        DEFAULT_SERVICE_CONFIG_ID,
      );
      expect(agentType).toBe(AgentMap.PredictTrader);
    });

    it('returns null when no service matches', () => {
      setupMock({ services: [], selectedService: undefined });

      const { result } = renderHook(() => useService(undefined));

      const agentType = result.current.getAgentTypeOf(
        EvmChainIdMap.Gnosis,
        'nonexistent',
      );
      expect(agentType).toBeNull();
    });

    it('returns null when service exists but no agent config matches', () => {
      const svc = makeFullService({
        service_public_id: 'unknown/service:0.0.0',
        home_chain: MiddlewareChainMap.GNOSIS,
      });
      setupMock({ services: [svc], selectedService: svc });

      const { result } = renderHook(() =>
        useService(DEFAULT_SERVICE_CONFIG_ID),
      );

      const agentType = result.current.getAgentTypeOf(
        EvmChainIdMap.Gnosis,
        DEFAULT_SERVICE_CONFIG_ID,
      );
      expect(agentType).toBeNull();
    });

    it.each([
      {
        agentType: AgentMap.Optimus as AgentType,
        chainId: EvmChainIdMap.Optimism,
        chain: MiddlewareChainMap.OPTIMISM,
      },
      {
        agentType: AgentMap.Modius as AgentType,
        chainId: EvmChainIdMap.Mode,
        chain: MiddlewareChainMap.MODE,
      },
      {
        agentType: AgentMap.AgentsFun as AgentType,
        chainId: EvmChainIdMap.Base,
        chain: MiddlewareChainMap.BASE,
      },
      {
        agentType: AgentMap.PettAi as AgentType,
        chainId: EvmChainIdMap.Base,
        chain: MiddlewareChainMap.BASE,
      },
      {
        agentType: AgentMap.Polystrat as AgentType,
        chainId: EvmChainIdMap.Polygon,
        chain: MiddlewareChainMap.POLYGON,
      },
    ])(
      'resolves $agentType on chain $chain',
      ({ agentType, chainId, chain }) => {
        const config = AGENT_CONFIG[agentType];
        const configId = `sc-${agentType}-config`;
        const svc = makeFullService({
          service_config_id: configId,
          service_public_id: config.servicePublicId,
          home_chain: chain,
        });
        setupMock({ services: [svc], selectedService: svc });

        const { result } = renderHook(() => useService(configId));

        const resolved = result.current.getAgentTypeOf(chainId, configId);
        expect(resolved).toBe(agentType);
      },
    );
  });

  // -------------------------------------------------------------------
  // 8. Status flags
  // -------------------------------------------------------------------
  describe('status flags', () => {
    describe('isServiceTransitioning', () => {
      it.each([
        MiddlewareDeploymentStatusMap.DEPLOYING,
        MiddlewareDeploymentStatusMap.STOPPING,
      ])('is true for status %s', (status) => {
        const svc = makeFullService({ deploymentStatus: status });
        setupMock({ services: [svc], selectedService: svc });

        const { result } = renderHook(() =>
          useService(DEFAULT_SERVICE_CONFIG_ID),
        );
        expect(result.current.isServiceTransitioning).toBe(true);
      });

      it.each([
        MiddlewareDeploymentStatusMap.DEPLOYED,
        MiddlewareDeploymentStatusMap.STOPPED,
        MiddlewareDeploymentStatusMap.CREATED,
        MiddlewareDeploymentStatusMap.BUILT,
        MiddlewareDeploymentStatusMap.DELETED,
      ])('is false for status %s', (status) => {
        const svc = makeFullService({ deploymentStatus: status });
        setupMock({ services: [svc], selectedService: svc });

        const { result } = renderHook(() =>
          useService(DEFAULT_SERVICE_CONFIG_ID),
        );
        expect(result.current.isServiceTransitioning).toBe(false);
      });
    });

    describe('isServiceRunning', () => {
      it.each([
        MiddlewareDeploymentStatusMap.DEPLOYED,
        MiddlewareDeploymentStatusMap.DEPLOYING,
        MiddlewareDeploymentStatusMap.STOPPING,
      ])('is true for status %s', (status) => {
        const svc = makeFullService({ deploymentStatus: status });
        setupMock({ services: [svc], selectedService: svc });

        const { result } = renderHook(() =>
          useService(DEFAULT_SERVICE_CONFIG_ID),
        );
        expect(result.current.isServiceRunning).toBe(true);
      });

      it.each([
        MiddlewareDeploymentStatusMap.STOPPED,
        MiddlewareDeploymentStatusMap.CREATED,
        MiddlewareDeploymentStatusMap.BUILT,
        MiddlewareDeploymentStatusMap.DELETED,
      ])('is false for status %s', (status) => {
        const svc = makeFullService({ deploymentStatus: status });
        setupMock({ services: [svc], selectedService: svc });

        const { result } = renderHook(() =>
          useService(DEFAULT_SERVICE_CONFIG_ID),
        );
        expect(result.current.isServiceRunning).toBe(false);
      });
    });

    describe('isServiceActive', () => {
      it('is true only for DEPLOYED', () => {
        const svc = makeFullService({
          deploymentStatus: MiddlewareDeploymentStatusMap.DEPLOYED,
        });
        setupMock({ services: [svc], selectedService: svc });

        const { result } = renderHook(() =>
          useService(DEFAULT_SERVICE_CONFIG_ID),
        );
        expect(result.current.isServiceActive).toBe(true);
      });

      it.each([
        MiddlewareDeploymentStatusMap.DEPLOYING,
        MiddlewareDeploymentStatusMap.STOPPING,
        MiddlewareDeploymentStatusMap.STOPPED,
        MiddlewareDeploymentStatusMap.CREATED,
        MiddlewareDeploymentStatusMap.BUILT,
        MiddlewareDeploymentStatusMap.DELETED,
      ])('is false for status %s', (status) => {
        const svc = makeFullService({ deploymentStatus: status });
        setupMock({ services: [svc], selectedService: svc });

        const { result } = renderHook(() =>
          useService(DEFAULT_SERVICE_CONFIG_ID),
        );
        expect(result.current.isServiceActive).toBe(false);
      });
    });

    describe('isServiceBuilding', () => {
      it('is true for status BUILT', () => {
        const svc = makeFullService({
          deploymentStatus: MiddlewareDeploymentStatusMap.BUILT,
        });
        setupMock({ services: [svc], selectedService: svc });

        const { result } = renderHook(() =>
          useService(DEFAULT_SERVICE_CONFIG_ID),
        );
        expect(result.current.isServiceBuilding).toBe(true);
      });

      // NOTE: CREATED (0) is falsy, so the deploymentStatus memo returns
      // undefined — making isServiceBuilding false. This is a known quirk
      // of the `if (service.deploymentStatus)` check in the source.
      it.each([
        MiddlewareDeploymentStatusMap.CREATED,
        MiddlewareDeploymentStatusMap.DEPLOYED,
        MiddlewareDeploymentStatusMap.DEPLOYING,
        MiddlewareDeploymentStatusMap.STOPPING,
        MiddlewareDeploymentStatusMap.STOPPED,
        MiddlewareDeploymentStatusMap.DELETED,
      ])('is false for status %s', (status) => {
        const svc = makeFullService({ deploymentStatus: status });
        setupMock({ services: [svc], selectedService: svc });

        const { result } = renderHook(() =>
          useService(DEFAULT_SERVICE_CONFIG_ID),
        );
        expect(result.current.isServiceBuilding).toBe(false);
      });
    });
  });

  // -------------------------------------------------------------------
  // 9. Edge cases
  // -------------------------------------------------------------------
  describe('edge cases', () => {
    it('returns isLoaded from useServices isFetched', () => {
      setupMock({ services: [], selectedService: undefined, isFetched: false });

      const { result } = renderHook(() => useService(undefined));
      expect(result.current.isLoaded).toBe(false);
    });

    it('handles undefined services array', () => {
      mockUseServices.mockReturnValue({
        services: undefined,
        selectedService: undefined,
        isFetched: true,
      });

      const { result } = renderHook(() =>
        useService(DEFAULT_SERVICE_CONFIG_ID),
      );

      expect(result.current.service).toBeUndefined();
      expect(result.current.serviceWallets).toEqual([]);
      expect(result.current.serviceSafes).toEqual([]);
      expect(result.current.serviceEoa).toBeUndefined();
      expect(result.current.deploymentStatus).toBeUndefined();
      expect(result.current.serviceNftTokenId).toBeUndefined();
      expect(result.current.isServiceRunning).toBe(false);
      expect(result.current.isServiceActive).toBe(false);
      expect(result.current.isServiceTransitioning).toBe(false);
      expect(result.current.isServiceBuilding).toBe(false);
    });

    it('agentAddresses includes both instance and multisig addresses', () => {
      const svc = makeFullService();
      setupMock({ services: [svc], selectedService: svc });

      const { result } = renderHook(() =>
        useService(DEFAULT_SERVICE_CONFIG_ID),
      );

      expect(result.current.agentAddresses).toContain(MOCK_MULTISIG_ADDRESS);
      expect(result.current.agentAddresses).toContain(MOCK_INSTANCE_ADDRESS);
    });

    it('agentAddresses is empty when no service found', () => {
      setupMock({ services: [], selectedService: undefined });

      const { result } = renderHook(() => useService(undefined));
      expect(result.current.agentAddresses).toEqual([]);
    });

    it('handles service with empty chain_configs in serviceWallets', () => {
      const svc = makeFullService({ chain_configs: {} });
      setupMock({ services: [svc], selectedService: svc });

      const { result } = renderHook(() =>
        useService(DEFAULT_SERVICE_CONFIG_ID),
      );

      expect(result.current.serviceWallets).toEqual([]);
    });
  });
});
