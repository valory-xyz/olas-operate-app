import { renderHook } from '@testing-library/react';
import { act, createElement, PropsWithChildren } from 'react';

import { STEPS } from '../../components/PearlWallet/types';
import { getInitialDepositForMasterSafe } from '../../components/PearlWallet/utils';
import { TokenSymbolMap } from '../../config/tokens';
import { EvmChainIdMap, MiddlewareChainMap, PAGES } from '../../constants';
import { AgentMap } from '../../constants/agent';
import {
  PearlWalletProvider,
  usePearlWallet,
} from '../../context/PearlWalletProvider';
import {
  useAvailableAssets,
  useBalanceAndRefillRequirementsContext,
  useBalanceContext,
  useMasterWalletContext,
  usePageState,
  useService,
  useServices,
} from '../../hooks';
import { AvailableAsset } from '../../types/Wallet';
import {
  DEFAULT_SAFE_ADDRESS,
  DEFAULT_SERVICE_CONFIG_ID,
  MOCK_MULTISIG_ADDRESS,
  MOCK_SERVICE_CONFIG_ID_2,
  POLYGON_SAFE_ADDRESS,
  SECOND_SAFE_ADDRESS,
  SERVICE_PUBLIC_ID_MAP,
} from '../helpers/factories';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../constants/providers', () => ({}));

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  '../../config/agents',
  () => require('../mocks/configAgents').configAgentsMock,
);

jest.mock(
  '../../config/chains',
  () => require('../mocks/configChains').configChainsMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */

const mockGetFundingEligibleServiceConfigIdsOf = jest.fn((): string[] => []);
const mockIsFundingEligible = jest.fn(() => true);

jest.mock('../../hooks', () => ({
  useAvailableAssets: jest.fn(() => ({
    isLoading: false,
    availableAssets: [],
  })),
  useBalanceAndRefillRequirementsContext: jest.fn(() => ({
    getRefillRequirementsOf: jest.fn(),
  })),
  useBalanceContext: jest.fn(() => ({
    isLoading: false,
    getStakedOlasBalanceOf: jest.fn(() => 0),
    getStakedOlasBalanceByServiceConfigId: jest.fn(() => 0),
  })),
  useFundingEligibleServices: () => ({
    getFundingEligibleServiceConfigIdsOf:
      mockGetFundingEligibleServiceConfigIdsOf,
    isFundingEligible: mockIsFundingEligible,
  }),
  useMasterWalletContext: jest.fn(() => ({
    masterSafes: [],
  })),
  usePageState: jest.fn(() => ({
    pageState: 'main',
    goto: jest.fn(),
  })),
  useService: jest.fn(() => ({
    isLoaded: true,
    getServiceSafeOf: jest.fn(),
    getAgentTypeOf: jest.fn(),
  })),
  useServices: jest.fn(() => ({
    isLoading: false,
    selectedAgentConfig: {
      evmHomeChainId: 100,
      middlewareHomeChainId: 'gnosis',
      displayName: 'Omenstrat',
    },
    selectedService: null,
    services: [],
    availableServiceConfigIds: [],
    getServiceConfigIdsOf: jest.fn(() => []),
  })),
}));

jest.mock('../../components/PearlWallet/utils', () => ({
  getInitialDepositForMasterSafe: jest.fn(),
}));

jest.mock('../../utils', () => ({
  generateAgentName: jest.fn(() => 'Agent Name'),
  isValidServiceId: jest.fn(() => false),
}));

const mockUseServices = useServices as jest.Mock;
const mockUsePageState = usePageState as jest.Mock;
const mockUseMasterWalletContext = useMasterWalletContext as jest.Mock;
const mockUseService = useService as jest.Mock;
const mockUseBalanceContext = useBalanceContext as jest.Mock;
const mockUseAvailableAssets = useAvailableAssets as jest.Mock;
const mockUseBalanceAndRefillRequirementsContext =
  useBalanceAndRefillRequirementsContext as jest.Mock;
const mockGetInitialDepositForMasterSafe =
  getInitialDepositForMasterSafe as jest.Mock;

const { isValidServiceId: mockIsValidServiceId, generateAgentName } =
  jest.requireMock('../../utils') as {
    isValidServiceId: jest.Mock;
    generateAgentName: jest.Mock;
  };

const wrapper = ({ children }: PropsWithChildren) =>
  createElement(PearlWalletProvider, null, children);

describe('PearlWalletProvider', () => {
  const mockGoto = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetFundingEligibleServiceConfigIdsOf.mockReturnValue([]);

    mockUseServices.mockReturnValue({
      isLoading: false,
      selectedAgentConfig: {
        evmHomeChainId: EvmChainIdMap.Gnosis,
        middlewareHomeChainId: MiddlewareChainMap.GNOSIS,
        displayName: 'Omenstrat',
      },
      selectedService: null,
      services: [],
      availableServiceConfigIds: [],
      getServiceConfigIdsOf: jest.fn(() => []),
    });

    mockUsePageState.mockReturnValue({
      pageState: PAGES.Main,
      goto: mockGoto,
    });

    mockUseMasterWalletContext.mockReturnValue({
      masterSafes: [],
    });

    mockUseService.mockReturnValue({
      isLoaded: true,
      getServiceSafeOf: jest.fn(),
      getAgentTypeOf: jest.fn(),
    });

    mockUseBalanceContext.mockReturnValue({
      isLoading: false,
      getStakedOlasBalanceOf: jest.fn(() => 0),
      getStakedOlasBalanceByServiceConfigId: jest.fn(() => 0),
    });

    mockUseAvailableAssets.mockReturnValue({
      isLoading: false,
      availableAssets: [],
    });

    mockUseBalanceAndRefillRequirementsContext.mockReturnValue({
      getRefillRequirementsOf: jest.fn(),
    });

    mockGetInitialDepositForMasterSafe.mockReturnValue(undefined);
  });

  it('provides initial walletStep as PEARL_WALLET_SCREEN', () => {
    const { result } = renderHook(() => usePearlWallet(), { wrapper });
    expect(result.current.walletStep).toBe(STEPS.PEARL_WALLET_SCREEN);
  });

  it('initializes walletChainId from selectedAgentConfig.evmHomeChainId', () => {
    const { result } = renderHook(() => usePearlWallet(), { wrapper });
    expect(result.current.walletChainId).toBe(EvmChainIdMap.Gnosis);
  });

  it('initializes empty amounts and default deposit values', () => {
    const { result } = renderHook(() => usePearlWallet(), { wrapper });
    expect(result.current.amountsToWithdraw).toEqual({});
    expect(result.current.amountsToDeposit).toEqual({});
    expect(result.current.defaultRequirementDepositValues).toEqual({});
  });

  describe('chain stability effect', () => {
    it('does not update walletChainId when on PearlWallet page', () => {
      mockUsePageState.mockReturnValue({
        pageState: PAGES.PearlWallet,
        goto: mockGoto,
      });

      const { result, rerender } = renderHook(() => usePearlWallet(), {
        wrapper,
      });

      expect(result.current.walletChainId).toBe(EvmChainIdMap.Gnosis);

      mockUseServices.mockReturnValue({
        isLoading: false,
        selectedAgentConfig: {
          evmHomeChainId: EvmChainIdMap.Polygon,
          middlewareHomeChainId: MiddlewareChainMap.POLYGON,
          displayName: 'Modius',
        },
        selectedService: null,
        services: [],
        availableServiceConfigIds: [],
        getServiceConfigIdsOf: jest.fn(() => []),
      });

      rerender();
      expect(result.current.walletChainId).toBe(EvmChainIdMap.Gnosis);
    });

    it('does not update walletChainId when on FundPearlWallet page', () => {
      mockUsePageState.mockReturnValue({
        pageState: PAGES.FundPearlWallet,
        goto: mockGoto,
      });

      const { result, rerender } = renderHook(() => usePearlWallet(), {
        wrapper,
      });

      mockUseServices.mockReturnValue({
        isLoading: false,
        selectedAgentConfig: {
          evmHomeChainId: EvmChainIdMap.Polygon,
          middlewareHomeChainId: MiddlewareChainMap.POLYGON,
          displayName: 'Modius',
        },
        selectedService: null,
        services: [],
        availableServiceConfigIds: [],
        getServiceConfigIdsOf: jest.fn(() => []),
      });

      rerender();
      expect(result.current.walletChainId).toBe(EvmChainIdMap.Gnosis);
    });

    it('updates walletChainId when on other pages', () => {
      mockUsePageState.mockReturnValue({
        pageState: PAGES.Main,
        goto: mockGoto,
      });

      const { result, rerender } = renderHook(() => usePearlWallet(), {
        wrapper,
      });

      expect(result.current.walletChainId).toBe(EvmChainIdMap.Gnosis);

      mockUseServices.mockReturnValue({
        isLoading: false,
        selectedAgentConfig: {
          evmHomeChainId: EvmChainIdMap.Polygon,
          middlewareHomeChainId: MiddlewareChainMap.POLYGON,
          displayName: 'Modius',
        },
        selectedService: null,
        services: [],
        availableServiceConfigIds: [],
        getServiceConfigIdsOf: jest.fn(() => []),
      });

      rerender();
      expect(result.current.walletChainId).toBe(EvmChainIdMap.Polygon);
    });

    it.each([
      ['Settings', PAGES.Settings],
      ['AgentStaking', PAGES.AgentStaking],
      ['Setup', PAGES.Setup],
    ] as const)('auto-syncs walletChainId when on %s page', (_label, page) => {
      mockUsePageState.mockReturnValue({
        pageState: page,
        goto: mockGoto,
      });

      const { result, rerender } = renderHook(() => usePearlWallet(), {
        wrapper,
      });

      expect(result.current.walletChainId).toBe(EvmChainIdMap.Gnosis);

      mockUseServices.mockReturnValue({
        isLoading: false,
        selectedAgentConfig: {
          evmHomeChainId: EvmChainIdMap.Optimism,
          middlewareHomeChainId: MiddlewareChainMap.OPTIMISM,
          displayName: 'Optimus',
        },
        selectedService: null,
        services: [],
        availableServiceConfigIds: [],
        getServiceConfigIdsOf: jest.fn(() => []),
      });

      rerender();
      expect(result.current.walletChainId).toBe(EvmChainIdMap.Optimism);
    });
  });

  describe('masterSafeAddress', () => {
    it('returns null when no safe matches walletChainId', () => {
      mockUseMasterWalletContext.mockReturnValue({ masterSafes: [] });

      const { result } = renderHook(() => usePearlWallet(), { wrapper });
      expect(result.current.masterSafeAddress).toBeNull();
    });

    it('returns matching safe address for walletChainId', () => {
      mockUseMasterWalletContext.mockReturnValue({
        masterSafes: [
          { evmChainId: EvmChainIdMap.Gnosis, address: DEFAULT_SAFE_ADDRESS },
          {
            evmChainId: EvmChainIdMap.Polygon,
            address: POLYGON_SAFE_ADDRESS,
          },
        ],
      });

      const { result } = renderHook(() => usePearlWallet(), { wrapper });
      expect(result.current.masterSafeAddress).toBe(DEFAULT_SAFE_ADDRESS);
    });

    it('returns null when masterSafes is undefined', () => {
      mockUseMasterWalletContext.mockReturnValue({
        masterSafes: undefined,
      });

      const { result } = renderHook(() => usePearlWallet(), { wrapper });
      expect(result.current.masterSafeAddress).toBeNull();
    });

    it('updates when walletChainId changes', () => {
      mockUseMasterWalletContext.mockReturnValue({
        masterSafes: [
          { evmChainId: EvmChainIdMap.Gnosis, address: DEFAULT_SAFE_ADDRESS },
          {
            evmChainId: EvmChainIdMap.Polygon,
            address: POLYGON_SAFE_ADDRESS,
          },
        ],
      });

      const { result } = renderHook(() => usePearlWallet(), { wrapper });
      expect(result.current.masterSafeAddress).toBe(DEFAULT_SAFE_ADDRESS);

      act(() => {
        result.current.onWalletChainChange(EvmChainIdMap.Polygon);
      });
      expect(result.current.masterSafeAddress).toBe(POLYGON_SAFE_ADDRESS);
    });
  });

  describe('chains (getChainList)', () => {
    it('returns empty array when services is undefined', () => {
      mockUseServices.mockReturnValue({
        isLoading: false,
        selectedAgentConfig: {
          evmHomeChainId: EvmChainIdMap.Gnosis,
          middlewareHomeChainId: MiddlewareChainMap.GNOSIS,
          displayName: 'Omenstrat',
        },
        selectedService: null,
        services: undefined,
        availableServiceConfigIds: [],
        getServiceConfigIdsOf: jest.fn(() => []),
      });

      const { result } = renderHook(() => usePearlWallet(), { wrapper });
      expect(result.current.chains).toEqual([]);
    });

    it('returns empty array when services is empty', () => {
      const { result } = renderHook(() => usePearlWallet(), { wrapper });
      expect(result.current.chains).toEqual([]);
    });

    it('returns chains matching ACTIVE_AGENTS', () => {
      mockUseServices.mockReturnValue({
        isLoading: false,
        selectedAgentConfig: {
          evmHomeChainId: EvmChainIdMap.Gnosis,
          middlewareHomeChainId: MiddlewareChainMap.GNOSIS,
          displayName: 'Omenstrat',
        },
        selectedService: null,
        services: [
          {
            service_public_id: SERVICE_PUBLIC_ID_MAP.TRADER,
            home_chain: MiddlewareChainMap.GNOSIS,
            service_config_id: DEFAULT_SERVICE_CONFIG_ID,
          },
        ],
        availableServiceConfigIds: [],
        getServiceConfigIdsOf: jest.fn(() => []),
      });

      const { result } = renderHook(() => usePearlWallet(), { wrapper });
      expect(result.current.chains).toEqual([
        { chainId: EvmChainIdMap.Gnosis, chainName: 'Gnosis' },
      ]);
    });

    it('returns multiple unique chains for different services', () => {
      mockUseServices.mockReturnValue({
        isLoading: false,
        selectedAgentConfig: {
          evmHomeChainId: EvmChainIdMap.Base,
          middlewareHomeChainId: MiddlewareChainMap.BASE,
          displayName: 'Agents.fun',
        },
        selectedService: null,
        services: [
          {
            service_public_id: SERVICE_PUBLIC_ID_MAP.MEMOOORR,
            home_chain: MiddlewareChainMap.BASE,
            service_config_id: DEFAULT_SERVICE_CONFIG_ID,
          },
          {
            service_public_id: SERVICE_PUBLIC_ID_MAP.TRADER,
            home_chain: MiddlewareChainMap.GNOSIS,
            service_config_id: MOCK_SERVICE_CONFIG_ID_2,
          },
        ],
        availableServiceConfigIds: [],
        getServiceConfigIdsOf: jest.fn(() => []),
      });

      const { result } = renderHook(() => usePearlWallet(), { wrapper });
      expect(result.current.chains).toHaveLength(2);
      expect(result.current.chains).toContainEqual({
        chainId: EvmChainIdMap.Base,
        chainName: 'Base',
      });
      expect(result.current.chains).toContainEqual({
        chainId: EvmChainIdMap.Gnosis,
        chainName: 'Gnosis',
      });
    });

    it('deduplicates chains when multiple services are on the same chain', () => {
      mockUseServices.mockReturnValue({
        isLoading: false,
        selectedAgentConfig: {
          evmHomeChainId: EvmChainIdMap.Base,
          middlewareHomeChainId: MiddlewareChainMap.BASE,
          displayName: 'Agents.fun',
        },
        selectedService: null,
        services: [
          {
            service_public_id: SERVICE_PUBLIC_ID_MAP.MEMOOORR,
            home_chain: MiddlewareChainMap.BASE,
            service_config_id: DEFAULT_SERVICE_CONFIG_ID,
          },
          {
            service_public_id: SERVICE_PUBLIC_ID_MAP.PETT_AI,
            home_chain: MiddlewareChainMap.BASE,
            service_config_id: MOCK_SERVICE_CONFIG_ID_2,
          },
        ],
        availableServiceConfigIds: [],
        getServiceConfigIdsOf: jest.fn(() => []),
      });

      const { result } = renderHook(() => usePearlWallet(), { wrapper });
      expect(result.current.chains).toHaveLength(1);
      expect(result.current.chains[0].chainId).toBe(EvmChainIdMap.Base);
    });

    it('skips services not matching any ACTIVE_AGENTS entry', () => {
      mockUseServices.mockReturnValue({
        isLoading: false,
        selectedAgentConfig: {
          evmHomeChainId: EvmChainIdMap.Gnosis,
          middlewareHomeChainId: MiddlewareChainMap.GNOSIS,
          displayName: 'Omenstrat',
        },
        selectedService: null,
        services: [
          {
            service_public_id: 'unknown/agent:0.1.0',
            home_chain: MiddlewareChainMap.GNOSIS,
            service_config_id: 'sc-unknown',
          },
        ],
        availableServiceConfigIds: [],
        getServiceConfigIdsOf: jest.fn(() => []),
      });

      const { result } = renderHook(() => usePearlWallet(), { wrapper });
      expect(result.current.chains).toEqual([]);
    });
  });

  describe('availableAssets', () => {
    it('forwards availableAssets from useAvailableAssets hook', () => {
      const mockAssets: AvailableAsset[] = [
        {
          symbol: TokenSymbolMap.OLAS,
          amount: 100,
          amountInStr: '100',
          address: DEFAULT_SAFE_ADDRESS,
        },
        {
          symbol: TokenSymbolMap.XDAI,
          amount: 5.5,
          amountInStr: '5.5',
          address: SECOND_SAFE_ADDRESS,
        },
      ];
      mockUseAvailableAssets.mockReturnValue({
        isLoading: false,
        availableAssets: mockAssets,
      });

      const { result } = renderHook(() => usePearlWallet(), { wrapper });
      expect(result.current.availableAssets).toBe(mockAssets);
    });

    it('passes includeMasterEoa=true when not on DEPOSIT step', () => {
      renderHook(() => usePearlWallet(), { wrapper });

      expect(mockUseAvailableAssets).toHaveBeenCalledWith(
        EvmChainIdMap.Gnosis,
        { includeMasterEoa: true },
      );
    });

    it('passes includeMasterEoa=true when on DEPOSIT step but not on DepositOlasForStaking page', () => {
      mockUsePageState.mockReturnValue({
        pageState: PAGES.Main,
        goto: mockGoto,
      });

      const { result } = renderHook(() => usePearlWallet(), { wrapper });

      act(() => {
        result.current.updateStep(STEPS.DEPOSIT);
      });

      // After re-render, useAvailableAssets should be called with includeMasterEoa=true
      // because pageState is not DepositOlasForStaking
      expect(mockUseAvailableAssets).toHaveBeenCalledWith(
        EvmChainIdMap.Gnosis,
        { includeMasterEoa: true },
      );
    });

    it('passes includeMasterEoa=false when on DEPOSIT step AND DepositOlasForStaking page', () => {
      mockUsePageState.mockReturnValue({
        pageState: PAGES.DepositOlasForStaking,
        goto: mockGoto,
      });

      const { result } = renderHook(() => usePearlWallet(), { wrapper });

      act(() => {
        result.current.updateStep(STEPS.DEPOSIT);
      });

      // The last call should have includeMasterEoa=false
      const lastCall =
        mockUseAvailableAssets.mock.calls[
          mockUseAvailableAssets.mock.calls.length - 1
        ];
      expect(lastCall[1]).toEqual({ includeMasterEoa: false });
    });
  });

  describe('stakedAssets', () => {
    const STAKED_CONFIG_ID = 'sc-staked-001';

    it('returns empty array when no service config ids match walletChainId', () => {
      mockUseServices.mockReturnValue({
        isLoading: false,
        selectedAgentConfig: {
          evmHomeChainId: EvmChainIdMap.Gnosis,
          middlewareHomeChainId: MiddlewareChainMap.GNOSIS,
          displayName: 'Omenstrat',
        },
        selectedService: null,
        services: [],
        availableServiceConfigIds: [
          {
            configId: STAKED_CONFIG_ID,
            chainId: EvmChainIdMap.Polygon,
            tokenId: 42,
          },
        ],
        getServiceConfigIdsOf: jest.fn(() => []),
      });

      const { result } = renderHook(() => usePearlWallet(), { wrapper });
      expect(result.current.stakedAssets).toEqual([]);
    });

    it('returns staked asset with fallback display name when tokenId is invalid', () => {
      mockIsValidServiceId.mockReturnValue(false);
      const mockGetServiceSafeOf = jest.fn(() => ({
        address: MOCK_MULTISIG_ADDRESS,
      }));
      const mockGetAgentTypeOf = jest.fn(() => AgentMap.PredictTrader);
      const mockGetStakedOlasBalanceOf = jest.fn(() => 42);

      mockUseService.mockReturnValue({
        isLoaded: true,
        getServiceSafeOf: mockGetServiceSafeOf,
        getAgentTypeOf: mockGetAgentTypeOf,
      });

      mockUseBalanceContext.mockReturnValue({
        isLoading: false,
        getStakedOlasBalanceOf: mockGetStakedOlasBalanceOf,
        getStakedOlasBalanceByServiceConfigId: jest.fn(() => 0),
      });

      mockUseServices.mockReturnValue({
        isLoading: false,
        selectedAgentConfig: {
          evmHomeChainId: EvmChainIdMap.Gnosis,
          middlewareHomeChainId: MiddlewareChainMap.GNOSIS,
          displayName: 'Omenstrat',
        },
        selectedService: null,
        services: [],
        availableServiceConfigIds: [
          {
            configId: STAKED_CONFIG_ID,
            chainId: EvmChainIdMap.Gnosis,
            tokenId: undefined,
          },
        ],
        getServiceConfigIdsOf: jest.fn(() => [STAKED_CONFIG_ID]),
      });

      const { result } = renderHook(() => usePearlWallet(), { wrapper });

      expect(result.current.stakedAssets).toHaveLength(1);
      const asset = result.current.stakedAssets[0];
      expect(asset.agentName).toBe('My Omenstrat');
      expect(asset.symbol).toBe('OLAS');
      expect(asset.amount).toBe(42);
      expect(asset.configId).toBe(STAKED_CONFIG_ID);
      expect(asset.chainId).toBe(EvmChainIdMap.Gnosis);
      expect(asset.agentImgSrc).toBe(
        `/agent-${AgentMap.PredictTrader}-icon.png`,
      );
    });

    it('returns staked asset with generated name when tokenId is valid', () => {
      mockIsValidServiceId.mockReturnValue(true);
      generateAgentName.mockReturnValue('Olas Agent #7');

      mockUseService.mockReturnValue({
        isLoaded: true,
        getServiceSafeOf: jest.fn(() => ({
          address: MOCK_MULTISIG_ADDRESS,
        })),
        getAgentTypeOf: jest.fn(() => AgentMap.PredictTrader),
      });

      mockUseBalanceContext.mockReturnValue({
        isLoading: false,
        getStakedOlasBalanceOf: jest.fn(() => 100),
        getStakedOlasBalanceByServiceConfigId: jest.fn(() => 0),
      });

      mockUseServices.mockReturnValue({
        isLoading: false,
        selectedAgentConfig: {
          evmHomeChainId: EvmChainIdMap.Gnosis,
          middlewareHomeChainId: MiddlewareChainMap.GNOSIS,
          displayName: 'Omenstrat',
        },
        selectedService: null,
        services: [
          {
            service_config_id: STAKED_CONFIG_ID,
            home_chain: MiddlewareChainMap.GNOSIS,
            chain_configs: {
              [MiddlewareChainMap.GNOSIS]: {
                chain_data: { token: 7 },
              },
            },
          },
        ],
        availableServiceConfigIds: [
          {
            configId: STAKED_CONFIG_ID,
            chainId: EvmChainIdMap.Gnosis,
            tokenId: 7,
          },
        ],
        getServiceConfigIdsOf: jest.fn(() => [STAKED_CONFIG_ID]),
      });

      const { result } = renderHook(() => usePearlWallet(), { wrapper });

      expect(result.current.stakedAssets).toHaveLength(1);
      expect(result.current.stakedAssets[0].agentName).toBe('Olas Agent #7');
      expect(generateAgentName).toHaveBeenCalledWith(EvmChainIdMap.Gnosis, 7);
    });

    it('returns null agentImgSrc when agentType is null', () => {
      mockIsValidServiceId.mockReturnValue(false);
      mockUseService.mockReturnValue({
        isLoaded: true,
        getServiceSafeOf: jest.fn(() => ({
          address: MOCK_MULTISIG_ADDRESS,
        })),
        getAgentTypeOf: jest.fn(() => null),
      });

      mockUseServices.mockReturnValue({
        isLoading: false,
        selectedAgentConfig: {
          evmHomeChainId: EvmChainIdMap.Gnosis,
          middlewareHomeChainId: MiddlewareChainMap.GNOSIS,
          displayName: 'Omenstrat',
        },
        selectedService: null,
        services: [],
        availableServiceConfigIds: [
          {
            configId: STAKED_CONFIG_ID,
            chainId: EvmChainIdMap.Gnosis,
            tokenId: undefined,
          },
        ],
        getServiceConfigIdsOf: jest.fn(() => [STAKED_CONFIG_ID]),
      });

      const { result } = renderHook(() => usePearlWallet(), { wrapper });
      expect(result.current.stakedAssets[0].agentImgSrc).toBeNull();
    });

    it('uses 0 when getStakedOlasBalanceOf returns null', () => {
      mockIsValidServiceId.mockReturnValue(false);
      mockUseService.mockReturnValue({
        isLoaded: true,
        getServiceSafeOf: jest.fn(() => ({
          address: MOCK_MULTISIG_ADDRESS,
        })),
        getAgentTypeOf: jest.fn(() => AgentMap.PredictTrader),
      });

      mockUseBalanceContext.mockReturnValue({
        isLoading: false,
        getStakedOlasBalanceOf: jest.fn(() => null),
        getStakedOlasBalanceByServiceConfigId: jest.fn(() => 0),
      });

      mockUseServices.mockReturnValue({
        isLoading: false,
        selectedAgentConfig: {
          evmHomeChainId: EvmChainIdMap.Gnosis,
          middlewareHomeChainId: MiddlewareChainMap.GNOSIS,
          displayName: 'Omenstrat',
        },
        selectedService: null,
        services: [],
        availableServiceConfigIds: [
          {
            configId: STAKED_CONFIG_ID,
            chainId: EvmChainIdMap.Gnosis,
            tokenId: undefined,
          },
        ],
        getServiceConfigIdsOf: jest.fn(() => [STAKED_CONFIG_ID]),
      });

      const { result } = renderHook(() => usePearlWallet(), { wrapper });
      expect(result.current.stakedAssets[0].amount).toBe(0);
    });

    it('returns multiple staked assets for multiple configs on same chain', () => {
      const SECOND_CONFIG_ID = 'sc-staked-002';
      mockIsValidServiceId.mockReturnValue(false);
      mockUseService.mockReturnValue({
        isLoaded: true,
        getServiceSafeOf: jest.fn(() => ({
          address: MOCK_MULTISIG_ADDRESS,
        })),
        getAgentTypeOf: jest.fn(() => AgentMap.PredictTrader),
      });

      mockUseBalanceContext.mockReturnValue({
        isLoading: false,
        getStakedOlasBalanceOf: jest.fn(() => 10),
        getStakedOlasBalanceByServiceConfigId: jest.fn(() => 0),
      });

      mockUseServices.mockReturnValue({
        isLoading: false,
        selectedAgentConfig: {
          evmHomeChainId: EvmChainIdMap.Gnosis,
          middlewareHomeChainId: MiddlewareChainMap.GNOSIS,
          displayName: 'Omenstrat',
        },
        selectedService: null,
        services: [],
        availableServiceConfigIds: [
          {
            configId: STAKED_CONFIG_ID,
            chainId: EvmChainIdMap.Gnosis,
            tokenId: undefined,
          },
          {
            configId: SECOND_CONFIG_ID,
            chainId: EvmChainIdMap.Gnosis,
            tokenId: undefined,
          },
        ],
        getServiceConfigIdsOf: jest.fn(() => [
          STAKED_CONFIG_ID,
          SECOND_CONFIG_ID,
        ]),
      });

      const { result } = renderHook(() => usePearlWallet(), { wrapper });
      expect(result.current.stakedAssets).toHaveLength(2);
      expect(result.current.stakedAssets[0].configId).toBe(STAKED_CONFIG_ID);
      expect(result.current.stakedAssets[1].configId).toBe(SECOND_CONFIG_ID);
    });
  });

  describe('onReset', () => {
    it('clears withdraw and deposit amounts', () => {
      const { result } = renderHook(() => usePearlWallet(), { wrapper });

      act(() => {
        result.current.onAmountChange(TokenSymbolMap.XDAI, { amount: 1 });
        result.current.onDepositAmountChange(TokenSymbolMap.OLAS, {
          amount: 100,
        });
      });

      expect(result.current.amountsToWithdraw).toHaveProperty(
        TokenSymbolMap.XDAI,
      );
      expect(result.current.amountsToDeposit).toHaveProperty(
        TokenSymbolMap.OLAS,
      );

      act(() => {
        result.current.onReset();
      });
      expect(result.current.amountsToWithdraw).toEqual({});
      expect(result.current.amountsToDeposit).toEqual({});
    });

    it('clears defaultRequirementDepositValues', () => {
      mockUseMasterWalletContext.mockReturnValue({
        masterSafes: [
          { evmChainId: EvmChainIdMap.Gnosis, address: DEFAULT_SAFE_ADDRESS },
        ],
      });

      const mockDepositValues = {
        [TokenSymbolMap.OLAS]: { amount: 50 },
      };
      mockGetInitialDepositForMasterSafe.mockReturnValue(mockDepositValues);

      const { result } = renderHook(() => usePearlWallet(), { wrapper });

      act(() => {
        result.current.initializeDepositAmounts();
      });
      expect(result.current.defaultRequirementDepositValues).toEqual(
        mockDepositValues,
      );

      act(() => {
        result.current.onReset();
      });
      expect(result.current.defaultRequirementDepositValues).toEqual({});
    });

    it('resets walletStep when canNavigateOnReset is true', () => {
      const { result } = renderHook(() => usePearlWallet(), { wrapper });

      act(() => {
        result.current.updateStep(STEPS.SELECT_AMOUNT_TO_WITHDRAW);
      });

      expect(result.current.walletStep).toBe(STEPS.SELECT_AMOUNT_TO_WITHDRAW);

      act(() => {
        result.current.onReset(true);
      });
      expect(result.current.walletStep).toBe(STEPS.PEARL_WALLET_SCREEN);
    });

    it('does not reset walletStep when canNavigateOnReset is falsy', () => {
      const { result } = renderHook(() => usePearlWallet(), { wrapper });

      act(() => {
        result.current.updateStep(STEPS.SELECT_AMOUNT_TO_WITHDRAW);
      });

      act(() => {
        result.current.onReset();
      });
      expect(result.current.walletStep).toBe(STEPS.SELECT_AMOUNT_TO_WITHDRAW);
    });

    it('does not reset walletStep when canNavigateOnReset is false', () => {
      const { result } = renderHook(() => usePearlWallet(), { wrapper });

      act(() => {
        result.current.updateStep(STEPS.ENTER_WITHDRAWAL_ADDRESS);
      });

      act(() => {
        result.current.onReset(false);
      });
      expect(result.current.walletStep).toBe(STEPS.ENTER_WITHDRAWAL_ADDRESS);
    });
  });

  describe('onWalletChainChange', () => {
    it('changes walletChainId and resets amounts', () => {
      const { result } = renderHook(() => usePearlWallet(), { wrapper });

      act(() => {
        result.current.onAmountChange(TokenSymbolMap.XDAI, { amount: 5 });
      });

      act(() => {
        result.current.onWalletChainChange(EvmChainIdMap.Polygon);
      });
      expect(result.current.walletChainId).toBe(EvmChainIdMap.Polygon);
      expect(result.current.amountsToWithdraw).toEqual({});
    });

    it('resets step when canNavigateOnReset option is true', () => {
      const { result } = renderHook(() => usePearlWallet(), { wrapper });

      act(() => {
        result.current.updateStep(STEPS.SELECT_AMOUNT_TO_WITHDRAW);
      });
      expect(result.current.walletStep).toBe(STEPS.SELECT_AMOUNT_TO_WITHDRAW);

      act(() => {
        result.current.onWalletChainChange(EvmChainIdMap.Polygon, {
          canNavigateOnReset: true,
        });
      });
      expect(result.current.walletChainId).toBe(EvmChainIdMap.Polygon);
      expect(result.current.walletStep).toBe(STEPS.PEARL_WALLET_SCREEN);
    });

    it('does not reset step when canNavigateOnReset option is not provided', () => {
      const { result } = renderHook(() => usePearlWallet(), { wrapper });

      act(() => {
        result.current.updateStep(STEPS.DEPOSIT);
      });

      act(() => {
        result.current.onWalletChainChange(EvmChainIdMap.Polygon);
      });
      expect(result.current.walletStep).toBe(STEPS.DEPOSIT);
    });

    it('clears deposit amounts and default values', () => {
      mockUseMasterWalletContext.mockReturnValue({
        masterSafes: [
          { evmChainId: EvmChainIdMap.Gnosis, address: DEFAULT_SAFE_ADDRESS },
        ],
      });

      mockGetInitialDepositForMasterSafe.mockReturnValue({
        [TokenSymbolMap.OLAS]: { amount: 50 },
      });

      const { result } = renderHook(() => usePearlWallet(), { wrapper });

      act(() => {
        result.current.initializeDepositAmounts();
      });
      expect(result.current.amountsToDeposit).not.toEqual({});

      act(() => {
        result.current.onWalletChainChange(EvmChainIdMap.Polygon);
      });
      expect(result.current.amountsToDeposit).toEqual({});
      expect(result.current.defaultRequirementDepositValues).toEqual({});
    });
  });

  describe('gotoPearlWallet', () => {
    it('navigates to PearlWallet page and resets step', () => {
      const { result } = renderHook(() => usePearlWallet(), { wrapper });

      act(() => {
        result.current.updateStep(STEPS.ENTER_WITHDRAWAL_ADDRESS);
      });

      act(() => {
        result.current.gotoPearlWallet();
      });

      expect(mockGoto).toHaveBeenCalledWith(PAGES.PearlWallet);
      expect(result.current.walletStep).toBe(STEPS.PEARL_WALLET_SCREEN);
    });
  });

  describe('isLoading', () => {
    it('returns true when services are loading', () => {
      mockUseServices.mockReturnValue({
        isLoading: true,
        selectedAgentConfig: {
          evmHomeChainId: EvmChainIdMap.Gnosis,
          middlewareHomeChainId: MiddlewareChainMap.GNOSIS,
          displayName: 'Omenstrat',
        },
        selectedService: null,
        services: [],
        availableServiceConfigIds: [],
        getServiceConfigIdsOf: jest.fn(() => []),
      });

      const { result } = renderHook(() => usePearlWallet(), { wrapper });
      expect(result.current.isLoading).toBe(true);
    });

    it('returns true when service is not loaded', () => {
      mockUseService.mockReturnValue({
        isLoaded: false,
        getServiceSafeOf: jest.fn(),
        getAgentTypeOf: jest.fn(),
      });

      const { result } = renderHook(() => usePearlWallet(), { wrapper });
      expect(result.current.isLoading).toBe(true);
    });

    it('returns true when balance is loading', () => {
      mockUseBalanceContext.mockReturnValue({
        isLoading: true,
        getStakedOlasBalanceOf: jest.fn(() => 0),
        getStakedOlasBalanceByServiceConfigId: jest.fn(() => 0),
      });

      const { result } = renderHook(() => usePearlWallet(), { wrapper });
      expect(result.current.isLoading).toBe(true);
    });

    it('returns true when available assets are loading', () => {
      mockUseAvailableAssets.mockReturnValue({
        isLoading: true,
        availableAssets: [],
      });

      const { result } = renderHook(() => usePearlWallet(), { wrapper });
      expect(result.current.isLoading).toBe(true);
    });

    it('returns false when all loading states are complete', () => {
      const { result } = renderHook(() => usePearlWallet(), { wrapper });
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('updateStep', () => {
    it.each([
      ['SELECT_AMOUNT_TO_WITHDRAW', STEPS.SELECT_AMOUNT_TO_WITHDRAW],
      ['ENTER_WITHDRAWAL_ADDRESS', STEPS.ENTER_WITHDRAWAL_ADDRESS],
      ['DEPOSIT', STEPS.DEPOSIT],
      ['PEARL_WALLET_SCREEN', STEPS.PEARL_WALLET_SCREEN],
    ] as const)('updates walletStep to %s', (_label, step) => {
      const { result } = renderHook(() => usePearlWallet(), { wrapper });

      act(() => {
        result.current.updateStep(step);
      });
      expect(result.current.walletStep).toBe(step);
    });
  });

  describe('amount management', () => {
    it('onAmountChange updates withdrawal amounts', () => {
      const { result } = renderHook(() => usePearlWallet(), { wrapper });

      act(() => {
        result.current.onAmountChange(TokenSymbolMap.XDAI, { amount: 2.5 });
      });

      expect(result.current.amountsToWithdraw).toEqual({
        [TokenSymbolMap.XDAI]: { amount: 2.5 },
      });
    });

    it('onAmountChange supports withdrawAll flag', () => {
      const { result } = renderHook(() => usePearlWallet(), { wrapper });

      act(() => {
        result.current.onAmountChange(TokenSymbolMap.OLAS, {
          amount: 100,
          withdrawAll: true,
        });
      });

      expect(result.current.amountsToWithdraw).toEqual({
        [TokenSymbolMap.OLAS]: { amount: 100, withdrawAll: true },
      });
    });

    it('onAmountChange accumulates multiple token amounts', () => {
      const { result } = renderHook(() => usePearlWallet(), { wrapper });

      act(() => {
        result.current.onAmountChange(TokenSymbolMap.XDAI, { amount: 1 });
      });

      act(() => {
        result.current.onAmountChange(TokenSymbolMap.OLAS, { amount: 50 });
      });

      expect(result.current.amountsToWithdraw).toEqual({
        [TokenSymbolMap.XDAI]: { amount: 1 },
        [TokenSymbolMap.OLAS]: { amount: 50 },
      });
    });

    it('onAmountChange overwrites existing amount for same token', () => {
      const { result } = renderHook(() => usePearlWallet(), { wrapper });

      act(() => {
        result.current.onAmountChange(TokenSymbolMap.XDAI, { amount: 1 });
      });

      act(() => {
        result.current.onAmountChange(TokenSymbolMap.XDAI, { amount: 5 });
      });

      expect(result.current.amountsToWithdraw).toEqual({
        [TokenSymbolMap.XDAI]: { amount: 5 },
      });
    });

    it('onDepositAmountChange updates deposit amounts', () => {
      const { result } = renderHook(() => usePearlWallet(), { wrapper });

      act(() => {
        result.current.onDepositAmountChange(TokenSymbolMap.OLAS, {
          amount: 100,
        });
      });

      expect(result.current.amountsToDeposit).toEqual({
        [TokenSymbolMap.OLAS]: { amount: 100 },
      });
    });

    it('onDepositAmountChange accumulates multiple token amounts', () => {
      const { result } = renderHook(() => usePearlWallet(), { wrapper });

      act(() => {
        result.current.onDepositAmountChange(TokenSymbolMap.OLAS, {
          amount: 100,
        });
      });

      act(() => {
        result.current.onDepositAmountChange(TokenSymbolMap.XDAI, {
          amount: 10,
        });
      });

      expect(result.current.amountsToDeposit).toEqual({
        [TokenSymbolMap.OLAS]: { amount: 100 },
        [TokenSymbolMap.XDAI]: { amount: 10 },
      });
    });

    it('updateAmountsToDeposit replaces all deposit amounts', () => {
      const { result } = renderHook(() => usePearlWallet(), { wrapper });

      act(() => {
        result.current.onDepositAmountChange(TokenSymbolMap.XDAI, {
          amount: 1,
        });
      });

      act(() => {
        result.current.updateAmountsToDeposit({
          [TokenSymbolMap.OLAS]: { amount: 50 },
        });
      });

      expect(result.current.amountsToDeposit).toEqual({
        [TokenSymbolMap.OLAS]: { amount: 50 },
      });
    });

    it('updateAmountsToDeposit can set empty amounts', () => {
      const { result } = renderHook(() => usePearlWallet(), { wrapper });

      act(() => {
        result.current.onDepositAmountChange(TokenSymbolMap.OLAS, {
          amount: 100,
        });
      });

      act(() => {
        result.current.updateAmountsToDeposit({});
      });

      expect(result.current.amountsToDeposit).toEqual({});
    });
  });

  describe('initializeDepositAmounts', () => {
    it('does nothing when masterSafeAddress is null', () => {
      mockUseMasterWalletContext.mockReturnValue({ masterSafes: [] });

      const { result } = renderHook(() => usePearlWallet(), { wrapper });

      act(() => {
        result.current.initializeDepositAmounts();
      });

      expect(mockGetInitialDepositForMasterSafe).not.toHaveBeenCalled();
      expect(result.current.amountsToDeposit).toEqual({});
      expect(result.current.defaultRequirementDepositValues).toEqual({});
    });

    it('calls getInitialDepositForMasterSafe with correct arguments', () => {
      mockGetFundingEligibleServiceConfigIdsOf.mockReturnValue([
        DEFAULT_SERVICE_CONFIG_ID,
      ]);
      const mockGetRefillRequirementsOf = jest.fn();

      mockUseMasterWalletContext.mockReturnValue({
        masterSafes: [
          { evmChainId: EvmChainIdMap.Gnosis, address: DEFAULT_SAFE_ADDRESS },
        ],
      });

      mockUseBalanceAndRefillRequirementsContext.mockReturnValue({
        getRefillRequirementsOf: mockGetRefillRequirementsOf,
      });

      const { result } = renderHook(() => usePearlWallet(), { wrapper });

      act(() => {
        result.current.initializeDepositAmounts();
      });

      expect(mockGetInitialDepositForMasterSafe).toHaveBeenCalledWith(
        EvmChainIdMap.Gnosis,
        DEFAULT_SAFE_ADDRESS,
        [DEFAULT_SERVICE_CONFIG_ID],
        mockGetRefillRequirementsOf,
      );
    });

    it('sets deposit amounts and default values when result is returned', () => {
      const depositValues = {
        [TokenSymbolMap.OLAS]: { amount: 200 },
        [TokenSymbolMap.XDAI]: { amount: 1 },
      };

      mockGetInitialDepositForMasterSafe.mockReturnValue(depositValues);

      mockUseMasterWalletContext.mockReturnValue({
        masterSafes: [
          { evmChainId: EvmChainIdMap.Gnosis, address: DEFAULT_SAFE_ADDRESS },
        ],
      });

      const { result } = renderHook(() => usePearlWallet(), { wrapper });

      act(() => {
        result.current.initializeDepositAmounts();
      });

      expect(result.current.amountsToDeposit).toEqual(depositValues);
      expect(result.current.defaultRequirementDepositValues).toEqual(
        depositValues,
      );
    });

    it('does nothing when getInitialDepositForMasterSafe returns undefined', () => {
      mockGetInitialDepositForMasterSafe.mockReturnValue(undefined);

      mockUseMasterWalletContext.mockReturnValue({
        masterSafes: [
          { evmChainId: EvmChainIdMap.Gnosis, address: DEFAULT_SAFE_ADDRESS },
        ],
      });

      const { result } = renderHook(() => usePearlWallet(), { wrapper });

      act(() => {
        result.current.initializeDepositAmounts();
      });

      expect(result.current.amountsToDeposit).toEqual({});
      expect(result.current.defaultRequirementDepositValues).toEqual({});
    });

    it('excludes ineligible (archived) services from deposit pre-fill', () => {
      // Simulate an archived service: getFundingEligibleServiceConfigIdsOf
      // filters it out and returns an empty list.
      mockGetFundingEligibleServiceConfigIdsOf.mockReturnValue([]);
      const mockGetRefillRequirementsOf = jest.fn();

      mockUseMasterWalletContext.mockReturnValue({
        masterSafes: [
          { evmChainId: EvmChainIdMap.Gnosis, address: DEFAULT_SAFE_ADDRESS },
        ],
      });

      mockUseBalanceAndRefillRequirementsContext.mockReturnValue({
        getRefillRequirementsOf: mockGetRefillRequirementsOf,
      });

      const { result } = renderHook(() => usePearlWallet(), { wrapper });

      act(() => {
        result.current.initializeDepositAmounts();
      });

      expect(mockGetInitialDepositForMasterSafe).toHaveBeenCalledWith(
        EvmChainIdMap.Gnosis,
        DEFAULT_SAFE_ADDRESS,
        [],
        mockGetRefillRequirementsOf,
      );
    });
  });

  describe('usePearlWallet hook', () => {
    it('returns context when used within PearlWalletProvider', () => {
      const { result } = renderHook(() => usePearlWallet(), { wrapper });
      expect(result.current).toBeDefined();
      expect(result.current.walletStep).toBe(STEPS.PEARL_WALLET_SCREEN);
    });

    it('returns context with all expected properties', () => {
      const { result } = renderHook(() => usePearlWallet(), { wrapper });

      expect(result.current).toHaveProperty('walletStep');
      expect(result.current).toHaveProperty('updateStep');
      expect(result.current).toHaveProperty('gotoPearlWallet');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('chains');
      expect(result.current).toHaveProperty('masterSafeAddress');
      expect(result.current).toHaveProperty('walletChainId');
      expect(result.current).toHaveProperty('onWalletChainChange');
      expect(result.current).toHaveProperty('availableAssets');
      expect(result.current).toHaveProperty('stakedAssets');
      expect(result.current).toHaveProperty('amountsToWithdraw');
      expect(result.current).toHaveProperty('onAmountChange');
      expect(result.current).toHaveProperty('amountsToDeposit');
      expect(result.current).toHaveProperty('onDepositAmountChange');
      expect(result.current).toHaveProperty('updateAmountsToDeposit');
      expect(result.current).toHaveProperty('initializeDepositAmounts');
      expect(result.current).toHaveProperty('onReset');
      expect(result.current).toHaveProperty('defaultRequirementDepositValues');
    });
  });
});
