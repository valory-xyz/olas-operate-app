import { act, renderHook } from '@testing-library/react';

import { EvmChainIdMap } from '../../constants/chains';
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

jest.mock('../../context/SupportModalProvider', () => ({
  useSupportModal: jest.fn(() => ({
    toggleSupportModal: mockToggleSupportModal,
  })),
}));

const mockToggleSupportModal = jest.fn();
const mockCreateMasterSafe = jest.fn();

const POLYGON_CHAIN_ID = EvmChainIdMap.Polygon;

type CreationAndTransferDetails =
  | {
      safeCreationDetails?: {
        isSafeCreated?: boolean;
        status?: 'finish' | 'error';
        txnLink?: string | null;
      };
      transferDetails?: {
        isTransferComplete?: boolean;
        transfers?: Array<{
          symbol: string;
          status: string;
          txnLink: string | null;
        }>;
      };
    }
  | undefined;

const setupMocks = ({
  isLoading = false,
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

    it('resets shouldNavigateToFundYourAgent to false after resetShouldNavigate', () => {
      setupMocks({ masterSafeAddress: null, eoaBalances: [] });
      const { result } = renderHook(() => useCompleteAgentSetup());
      act(() => {
        result.current.handleCompleteSetup();
      });
      expect(result.current.shouldNavigateToFundYourAgent).toBe(true);
      act(() => {
        result.current.resetShouldNavigate();
      });
      expect(result.current.shouldNavigateToFundYourAgent).toBe(false);
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
          safeCreationDetails: { isSafeCreated: true, status: 'finish' },
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
});
