import { act, renderHook } from '@testing-library/react';

import { EvmChainIdMap } from '../../constants/chains';
import { PAGES } from '../../constants/pages';
import { SETUP_SCREEN } from '../../constants/setupScreen';
import { useCompleteAgentSetup } from '../../hooks/useCompleteAgentSetup';
import { useGetRefillRequirements } from '../../hooks/useGetRefillRequirements';
import { useMasterBalances } from '../../hooks/useMasterBalances';
import { useMasterSafeCreationAndTransfer } from '../../hooks/useMasterSafeCreationAndTransfer';
import { useServices } from '../../hooks/useServices';
import { useMasterWalletContext } from '../../hooks/useWallet';
import {
  makeOlasBalance,
  makeOlasRequirement,
  makeUsdceBalance,
  makeUsdceRequirement,
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

const mockToggleSupportModal = jest.fn();

jest.mock('../../context/SupportModalProvider', () => ({
  useSupportModal: jest.fn(() => ({
    toggleSupportModal: mockToggleSupportModal,
  })),
}));

const mockGoto = jest.fn();
const mockGotoSetup = jest.fn();

jest.mock('../../hooks/usePageState', () => ({
  usePageState: jest.fn(() => ({ goto: mockGoto })),
}));

jest.mock('../../hooks/useSetup', () => ({
  useSetup: jest.fn(() => ({ goto: mockGotoSetup })),
}));

const mockCreateMasterSafe = jest.fn();

const POLYGON_CHAIN_ID = EvmChainIdMap.Polygon;

type CreationAndTransferDetails = ReturnType<
  typeof useMasterSafeCreationAndTransfer
>['data'];

const setupMocks = ({
  isLoading = false,
  isBalancesLoaded = true,
  masterSafeAddress = null as string | null,
  isMasterWalletFetched = true,
  safeBalances = [] as ReturnType<typeof makeOlasBalance>[],
  eoaBalances = [] as ReturnType<typeof makeOlasBalance>[],
  totalTokenRequirements = [makeOlasRequirement(), makeUsdceRequirement()],
  isLoadingMasterSafeCreation = false,
  isErrorMasterSafeCreation = false,
  creationAndTransferDetails = undefined as CreationAndTransferDetails,
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

  (useMasterWalletContext as jest.Mock).mockReturnValue({
    getMasterSafeOf,
    isFetched: isMasterWalletFetched,
  });
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
    isLoaded: isBalancesLoaded,
  });
  (useMasterSafeCreationAndTransfer as jest.Mock).mockReturnValue({
    mutate: mockCreateMasterSafe,
    isPending: isLoadingMasterSafeCreation,
    isError: isErrorMasterSafeCreation,
    data: creationAndTransferDetails,
  });
};

describe('useCompleteAgentSetup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    mockCreateMasterSafe.mockReset();
  });

  describe('setupState derivation', () => {
    it('returns detecting when isLoading is true', () => {
      setupMocks({ isLoading: true });
      const { result } = renderHook(() => useCompleteAgentSetup());
      expect(result.current.setupState).toBe('detecting');
    });

    it('returns detecting when balance data is not yet loaded', () => {
      setupMocks({ isBalancesLoaded: false });
      const { result } = renderHook(() => useCompleteAgentSetup());
      expect(result.current.setupState).toBe('detecting');
    });

    it('returns needsSafeCreation when requirements are empty and Safe is null (vacuous truth)', () => {
      setupMocks({ totalTokenRequirements: [], masterSafeAddress: null });
      const { result } = renderHook(() => useCompleteAgentSetup());
      expect(result.current.setupState).toBe('needsSafeCreation');
    });

    it('returns readyToComplete when requirements are empty and Safe is deployed (vacuous truth)', () => {
      setupMocks({
        totalTokenRequirements: [],
        masterSafeAddress: POLYGON_SAFE_ADDRESS,
      });
      const { result } = renderHook(() => useCompleteAgentSetup());
      expect(result.current.setupState).toBe('readyToComplete');
    });

    it('returns detecting when enabled is false, regardless of data readiness', () => {
      setupMocks({
        masterSafeAddress: POLYGON_SAFE_ADDRESS,
        safeBalances: [makeOlasBalance(100), makeUsdceBalance(50)],
      });
      const { result } = renderHook(() => useCompleteAgentSetup(false));
      expect(result.current.setupState).toBe('detecting');
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

    it('sets modalToShow to setupComplete for readyToComplete', () => {
      setupMocks({
        masterSafeAddress: POLYGON_SAFE_ADDRESS,
        safeBalances: [makeOlasBalance(100), makeUsdceBalance(50)],
      });
      const { result } = renderHook(() => useCompleteAgentSetup());
      act(() => {
        result.current.handleCompleteSetup();
      });
      expect(result.current.modalToShow).toBe('setupComplete');
    });

    it('sets modalToShow to creatingSafe and calls createMasterSafe for needsSafeCreation', () => {
      setupMocks({
        masterSafeAddress: null,
        eoaBalances: [makeOlasBalance(100), makeUsdceBalance(50)],
      });
      const { result } = renderHook(() => useCompleteAgentSetup());
      act(() => {
        result.current.handleCompleteSetup();
      });
      expect(result.current.modalToShow).toBe('creatingSafe');
      expect(mockCreateMasterSafe).toHaveBeenCalledTimes(1);
    });

    it('does not fire createMasterSafe while mutation is already in flight (isPending guard)', () => {
      setupMocks({
        masterSafeAddress: null,
        eoaBalances: [makeOlasBalance(100), makeUsdceBalance(50)],
        isLoadingMasterSafeCreation: true,
      });
      const { result } = renderHook(() => useCompleteAgentSetup());
      act(() => {
        result.current.handleCompleteSetup();
      });
      expect(mockCreateMasterSafe).not.toHaveBeenCalled();
    });

    it('navigates to FundYourAgent setup screen for needsFunding', () => {
      setupMocks({ masterSafeAddress: null, eoaBalances: [] });
      const { result } = renderHook(() => useCompleteAgentSetup());
      act(() => {
        result.current.handleCompleteSetup();
      });
      expect(mockGotoSetup).toHaveBeenCalledWith(SETUP_SCREEN.FundYourAgent);
      expect(mockGoto).toHaveBeenCalledWith(PAGES.Setup);
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
      expect(result.current.modalToShow).toBe('creatingSafe');
      expect(mockCreateMasterSafe).toHaveBeenCalledTimes(2);
    });
  });

  describe('mutation outcome effects', () => {
    it('sets modalToShow to safeCreationFailed on network/transport error (isError)', () => {
      setupMocks({ isErrorMasterSafeCreation: true });
      const { result } = renderHook(() => useCompleteAgentSetup());
      expect(result.current.modalToShow).toBe('safeCreationFailed');
    });

    it('sets modalToShow to safeCreationFailed when backend reports safeCreationDetails.status === error', () => {
      setupMocks({
        creationAndTransferDetails: {
          safeCreationDetails: {
            isSafeCreated: false,
            status: 'error',
            txnLink: null,
          },
          transferDetails: {
            isTransferComplete: false,
            transfers: [],
          },
        },
      });
      const { result } = renderHook(() => useCompleteAgentSetup());
      expect(result.current.modalToShow).toBe('safeCreationFailed');
    });

    it('sets modalToShow to safeCreationFailed on partial transfer failure', () => {
      setupMocks({
        creationAndTransferDetails: {
          safeCreationDetails: {
            isSafeCreated: true,
            status: 'finish',
            txnLink: null,
          },
          transferDetails: {
            isTransferComplete: false,
            transfers: [{ symbol: 'OLAS', status: 'error', txnLink: null }],
          },
        },
      });
      const { result } = renderHook(() => useCompleteAgentSetup());
      expect(result.current.modalToShow).toBe('safeCreationFailed');
    });

    it('sets modalToShow to setupComplete after delay when isSafeCreated and isTransferComplete', async () => {
      jest.useFakeTimers();

      setupMocks({
        masterSafeAddress: POLYGON_SAFE_ADDRESS,
        isMasterWalletFetched: true,
        creationAndTransferDetails: {
          safeCreationDetails: {
            isSafeCreated: true,
            status: 'finish',
            txnLink: null,
          },
          transferDetails: {
            isTransferComplete: true,
            transfers: [],
          },
        },
      });

      const { result } = renderHook(() => useCompleteAgentSetup());

      // Modal should not be set yet (delay pending)
      expect(result.current.modalToShow).toBeNull();

      await act(async () => {
        jest.advanceTimersByTime(250);
        await Promise.resolve();
      });

      expect(result.current.modalToShow).toBe('setupComplete');

      jest.useRealTimers();
    });

    it('does not set setupComplete when the component unmounts before the delay fires', () => {
      jest.useFakeTimers();

      setupMocks({
        masterSafeAddress: POLYGON_SAFE_ADDRESS,
        isMasterWalletFetched: true,
        creationAndTransferDetails: {
          safeCreationDetails: {
            isSafeCreated: true,
            status: 'finish',
            txnLink: null,
          },
          transferDetails: {
            isTransferComplete: true,
            transfers: [],
          },
        },
      });

      const { result, unmount } = renderHook(() => useCompleteAgentSetup());
      expect(result.current.modalToShow).toBeNull();

      unmount();

      // Advancing time after unmount must not throw or attempt a state update
      expect(() => jest.advanceTimersByTime(500)).not.toThrow();

      jest.useRealTimers();
    });

    it('clears safeCreationFailed modal when shouldShowFailureModal flips back to false', () => {
      setupMocks({ isErrorMasterSafeCreation: true });
      const { result, rerender } = renderHook(() => useCompleteAgentSetup());
      expect(result.current.modalToShow).toBe('safeCreationFailed');

      // External state recovers — e.g. refetch shows Safe was created after all
      setupMocks({
        masterSafeAddress: POLYGON_SAFE_ADDRESS,
        safeBalances: [makeOlasBalance(100), makeUsdceBalance(50)],
        isErrorMasterSafeCreation: false,
      });
      rerender();

      expect(result.current.modalToShow).toBeNull();
    });

    it('does not re-fire mutation when handleCompleteSetup is called after post-success transition to readyToComplete', async () => {
      jest.useFakeTimers();

      // Initial state: Safe not yet deployed, EOA funded — triggers needsSafeCreation
      setupMocks({
        masterSafeAddress: null,
        eoaBalances: [makeOlasBalance(100), makeUsdceBalance(50)],
        isLoadingMasterSafeCreation: false,
        isErrorMasterSafeCreation: false,
      });
      const { result, rerender } = renderHook(() => useCompleteAgentSetup());

      // First call fires the mutation
      act(() => {
        result.current.handleCompleteSetup();
      });
      expect(result.current.setupState).toBe('needsSafeCreation');
      expect(mockCreateMasterSafe).toHaveBeenCalledTimes(1);

      // Simulate post-success: Safe is now deployed + funded, mutation data shows full success
      setupMocks({
        masterSafeAddress: POLYGON_SAFE_ADDRESS,
        isMasterWalletFetched: true,
        safeBalances: [makeOlasBalance(100), makeUsdceBalance(50)],
        isLoadingMasterSafeCreation: false,
        isErrorMasterSafeCreation: false,
        creationAndTransferDetails: {
          safeCreationDetails: {
            isSafeCreated: true,
            status: 'finish',
            txnLink: null,
          },
          transferDetails: { isTransferComplete: true, transfers: [] },
        },
      });
      rerender();

      expect(result.current.setupState).toBe('readyToComplete');

      await act(async () => {
        jest.advanceTimersByTime(250);
        await Promise.resolve();
      });

      expect(result.current.modalToShow).toBe('setupComplete');

      // Calling handleCompleteSetup again must NOT re-fire the mutation
      act(() => {
        result.current.handleCompleteSetup();
      });
      expect(mockCreateMasterSafe).toHaveBeenCalledTimes(1);
      expect(result.current.modalToShow).toBe('setupComplete');

      jest.useRealTimers();
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

  describe('dismissModal', () => {
    it('clears modalToShow back to null', () => {
      setupMocks({
        masterSafeAddress: POLYGON_SAFE_ADDRESS,
        safeBalances: [makeOlasBalance(100), makeUsdceBalance(50)],
      });
      const { result } = renderHook(() => useCompleteAgentSetup());
      act(() => {
        result.current.handleCompleteSetup();
      });
      expect(result.current.modalToShow).toBe('setupComplete');
      act(() => {
        result.current.dismissModal();
      });
      expect(result.current.modalToShow).toBeNull();
    });
  });
});
