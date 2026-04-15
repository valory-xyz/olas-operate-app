import { act, renderHook } from '@testing-library/react';

import { EvmChainIdMap } from '../../constants/chains';
import { useCompleteAgentSetup } from '../../hooks/useCompleteAgentSetup';
import { useGetRefillRequirements } from '../../hooks/useGetRefillRequirements';
import { useMasterBalances } from '../../hooks/useMasterBalances';
import { useMasterSafeCreationAndTransfer } from '../../hooks/useMasterSafeCreationAndTransfer';
import { useServices } from '../../hooks/useServices';
import { useMasterWalletContext } from '../../hooks/useWallet';
import {
  DEFAULT_EOA_ADDRESS,
  POLYGON_SAFE_ADDRESS,
} from '../helpers/factories';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../constants/providers', () => ({}));

jest.mock('../../hooks/useWallet', () => ({
  useMasterWalletContext: jest.fn(),
}));

jest.mock('../../hooks/useServices', () => ({
  useServices: jest.fn(),
}));

jest.mock('../../hooks/useGetRefillRequirements', () => ({
  useGetRefillRequirements: jest.fn(),
}));

jest.mock('../../hooks/useMasterBalances', () => ({
  useMasterBalances: jest.fn(),
}));

jest.mock('../../hooks/useMasterSafeCreationAndTransfer', () => ({
  useMasterSafeCreationAndTransfer: jest.fn(),
}));

jest.mock('../../context/SupportModalProvider', () => ({
  useSupportModal: jest.fn(() => ({
    toggleSupportModal: mockToggleSupportModal,
  })),
}));

const mockToggleSupportModal = jest.fn();
const mockCreateMasterSafe = jest.fn();

const POLYGON_CHAIN_ID = EvmChainIdMap.Polygon;

const makeOlasRequirement = () => ({
  symbol: 'OLAS',
  amount: 100,
  iconSrc: '/tokens/olas-icon.png',
});

const makeUsdceRequirement = () => ({
  symbol: 'USDC.e',
  amount: 50,
  iconSrc: '/tokens/usdc-icon.png',
});

const makeOlasBalance = (balance: number) => ({
  walletAddress: DEFAULT_EOA_ADDRESS,
  evmChainId: POLYGON_CHAIN_ID,
  symbol: 'OLAS',
  isNative: false,
  balance,
});

const makeUsdceBalance = (balance: number) => ({
  walletAddress: DEFAULT_EOA_ADDRESS,
  evmChainId: POLYGON_CHAIN_ID,
  symbol: 'USDC.e',
  isNative: false,
  balance,
});

const setupMocks = ({
  isLoading = false,
  masterSafeAddress = null as string | null,
  safeBalances = [] as ReturnType<typeof makeOlasBalance>[],
  eoaBalances = [] as ReturnType<typeof makeOlasBalance>[],
  totalTokenRequirements = [makeOlasRequirement(), makeUsdceRequirement()],
  isSuccessMasterSafeCreation = false,
  isErrorMasterSafeCreation = false,
} = {}) => {
  const getMasterSafeOf = jest
    .fn()
    .mockReturnValue(
      masterSafeAddress
        ? { address: masterSafeAddress, evmChainId: POLYGON_CHAIN_ID }
        : undefined,
    );
  const getMasterSafeBalancesOf = jest.fn().mockReturnValue(safeBalances);
  const getMasterEoaBalancesOf = jest.fn().mockReturnValue(eoaBalances);

  (useMasterWalletContext as jest.Mock).mockReturnValue({ getMasterSafeOf });
  (useServices as jest.Mock).mockReturnValue({
    selectedAgentConfig: { evmHomeChainId: POLYGON_CHAIN_ID },
  });
  (useGetRefillRequirements as jest.Mock).mockReturnValue({
    totalTokenRequirements,
    isLoading,
  });
  (useMasterBalances as jest.Mock).mockReturnValue({
    getMasterSafeBalancesOf,
    getMasterEoaBalancesOf,
  });
  (useMasterSafeCreationAndTransfer as jest.Mock).mockReturnValue({
    mutate: mockCreateMasterSafe,
    isSuccess: isSuccessMasterSafeCreation,
    isError: isErrorMasterSafeCreation,
  });
};

describe('useCompleteAgentSetup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateMasterSafe.mockReset();
  });

  describe('setupState derivation', () => {
    it('returns detecting when isLoading is true', () => {
      setupMocks({ isLoading: true });
      const { result } = renderHook(() => useCompleteAgentSetup());
      expect(result.current.setupState).toBe('detecting');
    });

    it('returns needsFunding when requirements are empty', () => {
      setupMocks({ totalTokenRequirements: [] });
      const { result } = renderHook(() => useCompleteAgentSetup());
      expect(result.current.setupState).toBe('needsFunding');
    });

    it('returns readyToComplete when Safe is deployed and fully funded', () => {
      setupMocks({
        masterSafeAddress: POLYGON_SAFE_ADDRESS,
        safeBalances: [makeOlasBalance(100), makeUsdceBalance(50)],
      });
      const { result } = renderHook(() => useCompleteAgentSetup());
      expect(result.current.setupState).toBe('readyToComplete');
    });

    it('returns needsFunding when Safe is deployed but only OLAS balance is sufficient', () => {
      setupMocks({
        masterSafeAddress: POLYGON_SAFE_ADDRESS,
        safeBalances: [makeOlasBalance(100), makeUsdceBalance(10)],
      });
      const { result } = renderHook(() => useCompleteAgentSetup());
      expect(result.current.setupState).toBe('needsFunding');
    });

    it('returns needsSafeCreation when Safe is null and EOA covers requirements', () => {
      setupMocks({
        masterSafeAddress: null,
        eoaBalances: [makeOlasBalance(100), makeUsdceBalance(50)],
      });
      const { result } = renderHook(() => useCompleteAgentSetup());
      expect(result.current.setupState).toBe('needsSafeCreation');
    });

    it('returns needsFunding when Safe is null and EOA does not cover requirements', () => {
      setupMocks({
        masterSafeAddress: null,
        eoaBalances: [makeOlasBalance(50), makeUsdceBalance(50)],
      });
      const { result } = renderHook(() => useCompleteAgentSetup());
      expect(result.current.setupState).toBe('needsFunding');
    });

    it('returns needsFunding when Safe is null and EOA has no balances', () => {
      setupMocks({ masterSafeAddress: null, eoaBalances: [] });
      const { result } = renderHook(() => useCompleteAgentSetup());
      expect(result.current.setupState).toBe('needsFunding');
    });
  });

  describe('handleCompleteSetup', () => {
    it('is a no-op when setupState is detecting', () => {
      setupMocks({ isLoading: true });
      const { result } = renderHook(() => useCompleteAgentSetup());
      act(() => {
        result.current.handleCompleteSetup();
      });
      expect(result.current.modalToShow).toBeNull();
      expect(mockCreateMasterSafe).not.toHaveBeenCalled();
    });

    it('sets modalToShow to complete for readyToComplete', () => {
      setupMocks({
        masterSafeAddress: POLYGON_SAFE_ADDRESS,
        safeBalances: [makeOlasBalance(100), makeUsdceBalance(50)],
      });
      const { result } = renderHook(() => useCompleteAgentSetup());
      act(() => {
        result.current.handleCompleteSetup();
      });
      expect(result.current.modalToShow).toBe('complete');
    });

    it('sets modalToShow to finishing and calls createMasterSafe for needsSafeCreation', () => {
      setupMocks({
        masterSafeAddress: null,
        eoaBalances: [makeOlasBalance(100), makeUsdceBalance(50)],
      });
      const { result } = renderHook(() => useCompleteAgentSetup());
      act(() => {
        result.current.handleCompleteSetup();
      });
      expect(result.current.modalToShow).toBe('finishing');
      expect(mockCreateMasterSafe).toHaveBeenCalledTimes(1);
    });

    it('guards against double mutation via hasAttemptedCreation', () => {
      setupMocks({
        masterSafeAddress: null,
        eoaBalances: [makeOlasBalance(100), makeUsdceBalance(50)],
      });
      const { result } = renderHook(() => useCompleteAgentSetup());
      act(() => {
        result.current.handleCompleteSetup();
        result.current.handleCompleteSetup();
      });
      expect(mockCreateMasterSafe).toHaveBeenCalledTimes(1);
    });

    it('sets shouldNavigateToFundYourAgent to true for needsFunding', () => {
      setupMocks({ masterSafeAddress: null, eoaBalances: [] });
      const { result } = renderHook(() => useCompleteAgentSetup());
      act(() => {
        result.current.handleCompleteSetup();
      });
      expect(result.current.shouldNavigateToFundYourAgent).toBe(true);
    });
  });

  describe('handleTryAgain', () => {
    it('resets modalToShow and retries the mutation', () => {
      setupMocks({
        masterSafeAddress: null,
        eoaBalances: [makeOlasBalance(100), makeUsdceBalance(50)],
      });
      const { result } = renderHook(() => useCompleteAgentSetup());
      act(() => {
        result.current.handleCompleteSetup();
      });
      expect(mockCreateMasterSafe).toHaveBeenCalledTimes(1);
      act(() => {
        result.current.handleTryAgain();
      });
      expect(result.current.modalToShow).toBe('finishing');
      expect(mockCreateMasterSafe).toHaveBeenCalledTimes(2);
    });

    it('allows retrying after handleTryAgain resets hasAttemptedCreation', () => {
      setupMocks({
        masterSafeAddress: null,
        eoaBalances: [makeOlasBalance(100), makeUsdceBalance(50)],
      });
      const { result } = renderHook(() => useCompleteAgentSetup());
      act(() => {
        result.current.handleCompleteSetup();
      });
      act(() => {
        result.current.handleTryAgain();
      });
      act(() => {
        result.current.handleCompleteSetup();
      });
      expect(mockCreateMasterSafe).toHaveBeenCalledTimes(3);
    });
  });

  describe('mutation outcome effects', () => {
    it('sets modalToShow to complete on mutation success', () => {
      setupMocks({ isSuccessMasterSafeCreation: true });
      const { result } = renderHook(() => useCompleteAgentSetup());
      expect(result.current.modalToShow).toBe('complete');
    });

    it('does not re-fire mutation when handleCompleteSetup is called after post-success transition to readyToComplete', () => {
      // Initial state: Safe not yet deployed, EOA funded — triggers needsSafeCreation
      setupMocks({
        masterSafeAddress: null,
        eoaBalances: [makeOlasBalance(100), makeUsdceBalance(50)],
        isSuccessMasterSafeCreation: false,
      });
      const { result, rerender } = renderHook(() => useCompleteAgentSetup());

      // First call fires the mutation
      act(() => {
        result.current.handleCompleteSetup();
      });
      expect(result.current.setupState).toBe('needsSafeCreation');
      expect(mockCreateMasterSafe).toHaveBeenCalledTimes(1);

      // Simulate post-success: Safe is now deployed + funded, mutation isSuccess = true
      setupMocks({
        masterSafeAddress: POLYGON_SAFE_ADDRESS,
        safeBalances: [makeOlasBalance(100), makeUsdceBalance(50)],
        isSuccessMasterSafeCreation: true,
      });
      rerender();

      expect(result.current.setupState).toBe('readyToComplete');
      expect(result.current.modalToShow).toBe('complete');

      // Calling handleCompleteSetup again must NOT re-fire the mutation
      act(() => {
        result.current.handleCompleteSetup();
      });
      expect(mockCreateMasterSafe).toHaveBeenCalledTimes(1);
      expect(result.current.modalToShow).toBe('complete');
    });

    it('sets modalToShow to failed on mutation error', () => {
      setupMocks({ isErrorMasterSafeCreation: true });
      const { result } = renderHook(() => useCompleteAgentSetup());
      expect(result.current.modalToShow).toBe('failed');
    });
  });

  describe('handleContactSupport', () => {
    it('calls toggleSupportModal', () => {
      setupMocks();
      const { result } = renderHook(() => useCompleteAgentSetup());
      act(() => {
        result.current.handleContactSupport();
      });
      expect(mockToggleSupportModal).toHaveBeenCalledTimes(1);
    });
  });
});
