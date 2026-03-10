import { renderHook } from '@testing-library/react';
import { act, createElement, PropsWithChildren } from 'react';

import { STEPS } from '../../components/PearlWallet/types';
import { EvmChainIdMap, PAGES } from '../../constants';
import {
  PearlWalletProvider,
  usePearlWallet,
} from '../../context/PearlWalletProvider';
import {
  useAvailableAssets,
  useBalanceContext,
  useMasterWalletContext,
  usePageState,
  useService,
  useServices,
} from '../../hooks';
import {
  DEFAULT_SAFE_ADDRESS,
  POLYGON_SAFE_ADDRESS,
} from '../helpers/factories';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../constants/providers', () => ({}));

jest.mock('../../config/agents', () => ({
  ACTIVE_AGENTS: [],
}));

jest.mock('../../config/chains', () => ({
  CHAIN_CONFIG: {
    100: { name: 'Gnosis', rpc: '', evmChainId: 100 },
    137: { name: 'Polygon', rpc: '', evmChainId: 137 },
  },
}));

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
  })),
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
      displayName: 'Trader',
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

jest.mock('../../utils/middlewareHelpers', () => ({
  asMiddlewareChain: jest.fn(() => 'gnosis'),
}));

const mockUseServices = useServices as jest.Mock;
const mockUsePageState = usePageState as jest.Mock;
const mockUseMasterWalletContext = useMasterWalletContext as jest.Mock;
const mockUseService = useService as jest.Mock;
const mockUseBalanceContext = useBalanceContext as jest.Mock;
const mockUseAvailableAssets = useAvailableAssets as jest.Mock;

const wrapper = ({ children }: PropsWithChildren) =>
  createElement(PearlWalletProvider, null, children);

describe('PearlWalletProvider', () => {
  const mockGoto = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseServices.mockReturnValue({
      isLoading: false,
      selectedAgentConfig: {
        evmHomeChainId: EvmChainIdMap.Gnosis,
        middlewareHomeChainId: 'gnosis',
        displayName: 'Trader',
      },
      selectedService: null,
      services: [],
      availableServiceConfigIds: [],
      getServiceConfigIdsOf: jest.fn(() => []),
    });

    mockUsePageState.mockReturnValue({
      pageState: 'main',
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
    });

    mockUseAvailableAssets.mockReturnValue({
      isLoading: false,
      availableAssets: [],
    });
  });

  it('provides initial walletStep as PEARL_WALLET_SCREEN', () => {
    const { result } = renderHook(() => usePearlWallet(), { wrapper });
    expect(result.current.walletStep).toBe(STEPS.PEARL_WALLET_SCREEN);
  });

  it('initializes walletChainId from selectedAgentConfig.evmHomeChainId', () => {
    const { result } = renderHook(() => usePearlWallet(), { wrapper });
    expect(result.current.walletChainId).toBe(EvmChainIdMap.Gnosis);
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

      // Simulate agent rotation changing selectedAgentConfig
      mockUseServices.mockReturnValue({
        isLoading: false,
        selectedAgentConfig: {
          evmHomeChainId: EvmChainIdMap.Polygon,
          middlewareHomeChainId: 'polygon',
          displayName: 'Modius',
        },
        selectedService: null,
        services: [],
        availableServiceConfigIds: [],
        getServiceConfigIdsOf: jest.fn(() => []),
      });

      rerender();
      // Chain should NOT change because user is on PearlWallet
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
          middlewareHomeChainId: 'polygon',
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
          middlewareHomeChainId: 'polygon',
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
  });

  describe('onReset', () => {
    it('clears withdraw and deposit amounts', () => {
      const { result } = renderHook(() => usePearlWallet(), { wrapper });

      // Set some amounts first
      act(() => {
        result.current.onAmountChange('XDAI', { amount: 1 });
        result.current.onDepositAmountChange('OLAS', { amount: 100 });
      });

      expect(result.current.amountsToWithdraw).toHaveProperty('XDAI');
      expect(result.current.amountsToDeposit).toHaveProperty('OLAS');

      act(() => {
        result.current.onReset();
      });
      expect(result.current.amountsToWithdraw).toEqual({});
      expect(result.current.amountsToDeposit).toEqual({});
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
  });

  describe('onWalletChainChange', () => {
    it('changes walletChainId and resets amounts', () => {
      const { result } = renderHook(() => usePearlWallet(), { wrapper });

      act(() => {
        result.current.onAmountChange('XDAI', { amount: 5 });
      });

      act(() => {
        result.current.onWalletChainChange(EvmChainIdMap.Polygon);
      });
      expect(result.current.walletChainId).toBe(EvmChainIdMap.Polygon);
      expect(result.current.amountsToWithdraw).toEqual({});
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
          middlewareHomeChainId: 'gnosis',
          displayName: 'Trader',
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
    it('updates walletStep to the specified step', () => {
      const { result } = renderHook(() => usePearlWallet(), { wrapper });

      act(() => {
        result.current.updateStep(STEPS.DEPOSIT);
      });
      expect(result.current.walletStep).toBe(STEPS.DEPOSIT);
    });
  });

  describe('amount management', () => {
    it('onAmountChange updates withdrawal amounts', () => {
      const { result } = renderHook(() => usePearlWallet(), { wrapper });

      act(() => {
        result.current.onAmountChange('XDAI', { amount: 2.5 });
      });

      expect(result.current.amountsToWithdraw).toEqual({
        XDAI: { amount: 2.5 },
      });
    });

    it('onDepositAmountChange updates deposit amounts', () => {
      const { result } = renderHook(() => usePearlWallet(), { wrapper });

      act(() => {
        result.current.onDepositAmountChange('OLAS', { amount: 100 });
      });

      expect(result.current.amountsToDeposit).toEqual({
        OLAS: { amount: 100 },
      });
    });

    it('updateAmountsToDeposit replaces all deposit amounts', () => {
      const { result } = renderHook(() => usePearlWallet(), { wrapper });

      act(() => {
        result.current.onDepositAmountChange('XDAI', { amount: 1 });
      });

      act(() => {
        result.current.updateAmountsToDeposit({
          OLAS: { amount: 50 },
        });
      });

      // Previous XDAI entry is gone — full replacement
      expect(result.current.amountsToDeposit).toEqual({
        OLAS: { amount: 50 },
      });
    });
  });
});
