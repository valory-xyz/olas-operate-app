import { renderHook } from '@testing-library/react';

import { EvmChainIdMap } from '../../../../constants/chains';
import {
  DEFAULT_SAFE_ADDRESS,
  MOCK_TX_HASH_1,
} from '../../../helpers/factories';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../../../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../../../constants/providers', () => ({}));
jest.mock('../../../../config/providers', () => ({ providers: [] }));

const mockUseServices = jest.fn();
const mockUseBridgingSteps = jest.fn();
const mockUseMasterSafeCreationAndTransfer = jest.fn();
const mockUseMasterWalletContext = jest.fn();

jest.mock('../../../../hooks', () => ({
  useServices: (...args: unknown[]) => mockUseServices(...args),
  useBridgingSteps: (...args: unknown[]) => mockUseBridgingSteps(...args),
  useMasterSafeCreationAndTransfer: (...args: unknown[]) =>
    mockUseMasterSafeCreationAndTransfer(...args),
  useMasterWalletContext: (...args: unknown[]) =>
    mockUseMasterWalletContext(...args),
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-var-requires */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {
  useMasterSafeCreateAndTransferSteps,
} = require('../../../../components/Bridge/BridgeInProgress/useMasterSafeCreateAndTransferSteps');
/* eslint-enable @typescript-eslint/no-var-requires */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_QUOTE_ID = 'quote-abc-123';
const MOCK_SYMBOLS = ['ETH', 'OLAS'];
const MOCK_TXN_LINK = `https://gnosisscan.io/tx/${MOCK_TX_HASH_1}`;

const mockCreateMasterSafe = jest.fn();

type HookProps = {
  mode: 'onboard' | 'deposit';
  isRefillRequired: boolean;
  symbols: string[];
  quoteId: string;
};

const defaultProps: HookProps = {
  mode: 'onboard',
  isRefillRequired: false,
  symbols: MOCK_SYMBOLS,
  quoteId: MOCK_QUOTE_ID,
};

const defaultBridging = () => ({
  isBridging: false,
  isBridgingFailed: false,
  isBridgingCompleted: false,
});

const defaultCreation = (): {
  isPending: boolean;
  isError: boolean;
  data: unknown;
  mutateAsync: jest.Mock;
} => ({
  isPending: false,
  isError: false,
  data: undefined,
  mutateAsync: mockCreateMasterSafe,
});

const defaultWallet = () => ({
  getMasterSafeOf: jest.fn().mockReturnValue(undefined),
  isFetched: false,
});

const setupMocks = (overrides?: {
  services?: { selectedAgentConfig: { evmHomeChainId: number } };
  bridging?: Partial<ReturnType<typeof defaultBridging>>;
  creation?: Partial<ReturnType<typeof defaultCreation>>;
  wallet?: Partial<ReturnType<typeof defaultWallet>>;
}) => {
  mockUseServices.mockReturnValue(
    overrides?.services ?? {
      selectedAgentConfig: { evmHomeChainId: EvmChainIdMap.Gnosis },
    },
  );
  mockUseBridgingSteps.mockReturnValue({
    ...defaultBridging(),
    ...overrides?.bridging,
  });
  mockUseMasterSafeCreationAndTransfer.mockReturnValue({
    ...defaultCreation(),
    ...overrides?.creation,
  });
  mockUseMasterWalletContext.mockReturnValue({
    ...defaultWallet(),
    ...overrides?.wallet,
  });
};

/**
 * renderHook + rerender: The ref is updated in useEffect (after render).
 * A second render reads the updated ref value.
 */
const renderAndSettle = (props: HookProps = defaultProps) => {
  const hookResult = renderHook(
    (p: HookProps) => useMasterSafeCreateAndTransferSteps(p),
    { initialProps: props },
  );
  hookResult.rerender(props);
  return hookResult;
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useMasterSafeCreateAndTransferSteps', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  // -------------------------------------------------------------------------
  // Basic return shape
  // -------------------------------------------------------------------------

  describe('return shape', () => {
    it('returns expected keys', () => {
      const { result } = renderAndSettle();
      expect(result.current).toHaveProperty('shouldCreateMasterSafe');
      expect(result.current).toHaveProperty('isLoadingMasterSafeCreation');
      expect(result.current).toHaveProperty('isMasterWalletFetched');
      expect(result.current).toHaveProperty(
        'isSafeCreationAndTransferCompleted',
      );
      expect(result.current.steps).toHaveProperty('masterSafeCreation');
      expect(result.current.steps).toHaveProperty('masterSafeTransfer');
    });
  });

  // -------------------------------------------------------------------------
  // shouldCreateMasterSafe ref guard
  // -------------------------------------------------------------------------

  describe('shouldCreateMasterSafe ref guard', () => {
    it('is null initially when isMasterWalletFetched is false', () => {
      setupMocks({ wallet: { isFetched: false } });
      const { result } = renderHook(() =>
        useMasterSafeCreateAndTransferSteps(defaultProps),
      );
      expect(result.current.shouldCreateMasterSafe).toBeNull();
    });

    it('remains null after re-render when isMasterWalletFetched is still false', () => {
      setupMocks({ wallet: { isFetched: false } });
      const { result } = renderAndSettle(defaultProps);
      expect(result.current.shouldCreateMasterSafe).toBeNull();
    });

    it('is true when mode=onboard and no master safe exists', () => {
      setupMocks({
        wallet: {
          getMasterSafeOf: jest.fn().mockReturnValue(undefined),
          isFetched: true,
        },
      });
      const { result } = renderAndSettle({ ...defaultProps, mode: 'onboard' });
      expect(result.current.shouldCreateMasterSafe).toBe(true);
    });

    it('is false when mode=deposit', () => {
      setupMocks({
        wallet: {
          getMasterSafeOf: jest.fn().mockReturnValue(undefined),
          isFetched: true,
        },
      });
      const { result } = renderAndSettle({ ...defaultProps, mode: 'deposit' });
      expect(result.current.shouldCreateMasterSafe).toBe(false);
    });

    it('is false when mode=onboard but master safe already exists', () => {
      setupMocks({
        wallet: {
          getMasterSafeOf: jest
            .fn()
            .mockReturnValue({ address: DEFAULT_SAFE_ADDRESS }),
          isFetched: true,
        },
      });
      const { result } = renderAndSettle({ ...defaultProps, mode: 'onboard' });
      expect(result.current.shouldCreateMasterSafe).toBe(false);
    });

    it('is only set once (ref guard does not change after initial set)', () => {
      const getMasterSafeOfMock = jest.fn().mockReturnValue(undefined);
      setupMocks({
        wallet: { getMasterSafeOf: getMasterSafeOfMock, isFetched: true },
      });
      const { result, rerender } = renderHook(
        (props) => useMasterSafeCreateAndTransferSteps(props),
        { initialProps: { ...defaultProps, mode: 'onboard' as const } },
      );
      rerender({ ...defaultProps, mode: 'onboard' as const });
      expect(result.current.shouldCreateMasterSafe).toBe(true);

      getMasterSafeOfMock.mockReturnValue({ address: DEFAULT_SAFE_ADDRESS });
      rerender({ ...defaultProps, mode: 'onboard' as const });
      expect(result.current.shouldCreateMasterSafe).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // hasMasterSafe derivation
  // -------------------------------------------------------------------------

  describe('hasMasterSafe derivation', () => {
    it('treats hasMasterSafe as false when wallet is not fetched', () => {
      setupMocks({
        wallet: {
          getMasterSafeOf: jest
            .fn()
            .mockReturnValue({ address: DEFAULT_SAFE_ADDRESS }),
          isFetched: false,
        },
      });
      const { result } = renderAndSettle();
      expect(result.current.isSafeCreationAndTransferCompleted).toBe(false);
    });

    it('treats hasMasterSafe as true when getMasterSafeOf returns a value', () => {
      setupMocks({
        wallet: {
          getMasterSafeOf: jest.fn().mockReturnValue({
            address: DEFAULT_SAFE_ADDRESS,
            evmChainId: EvmChainIdMap.Gnosis,
          }),
          isFetched: true,
        },
        creation: {
          data: {
            transferDetails: { isTransferComplete: true, transfers: [] },
            safeCreationDetails: { isSafeCreated: false },
          },
        },
      });
      const { result } = renderAndSettle();
      expect(result.current.isSafeCreationAndTransferCompleted).toBe(true);
    });

    it('treats hasMasterSafe as false when getMasterSafeOf returns undefined', () => {
      setupMocks({
        wallet: {
          getMasterSafeOf: jest.fn().mockReturnValue(undefined),
          isFetched: true,
        },
      });
      const { result } = renderAndSettle(defaultProps);
      expect(result.current.isSafeCreationAndTransferCompleted).toBeFalsy();
      expect(result.current.shouldCreateMasterSafe).toBe(true);
    });

    it('treats hasMasterSafe as false when getMasterSafeOf returns null', () => {
      setupMocks({
        wallet: {
          getMasterSafeOf: jest.fn().mockReturnValue(null),
          isFetched: true,
        },
      });
      const { result } = renderAndSettle(defaultProps);
      expect(result.current.isSafeCreationAndTransferCompleted).toBeFalsy();
      expect(result.current.shouldCreateMasterSafe).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // isSafeCreated derivation
  // -------------------------------------------------------------------------

  describe('isSafeCreated derivation', () => {
    it('is false when wallet not fetched even with creation data', () => {
      setupMocks({
        wallet: { isFetched: false },
        creation: {
          data: {
            safeCreationDetails: { isSafeCreated: true },
            transferDetails: { isTransferComplete: true, transfers: [] },
          },
        },
      });
      const { result } = renderAndSettle();
      expect(result.current.isSafeCreationAndTransferCompleted).toBe(false);
    });

    it('is true when hasMasterSafe is true (even without creation isSafeCreated)', () => {
      setupMocks({
        wallet: {
          getMasterSafeOf: jest
            .fn()
            .mockReturnValue({ address: DEFAULT_SAFE_ADDRESS }),
          isFetched: true,
        },
        creation: {
          data: {
            transferDetails: { isTransferComplete: true, transfers: [] },
            safeCreationDetails: { isSafeCreated: false },
          },
        },
      });
      const { result } = renderAndSettle();
      expect(result.current.isSafeCreationAndTransferCompleted).toBe(true);
    });

    it('is true when creationAndTransferDetails reports isSafeCreated', () => {
      setupMocks({
        wallet: {
          getMasterSafeOf: jest.fn().mockReturnValue(undefined),
          isFetched: true,
        },
        creation: {
          data: {
            safeCreationDetails: { isSafeCreated: true },
            transferDetails: { isTransferComplete: true, transfers: [] },
          },
        },
      });
      const { result } = renderAndSettle();
      expect(result.current.isSafeCreationAndTransferCompleted).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // isSafeCreationAndTransferCompleted
  // -------------------------------------------------------------------------

  describe('isSafeCreationAndTransferCompleted', () => {
    it('is false when isSafeCreated is true but isTransferCompleted is falsy', () => {
      setupMocks({
        wallet: {
          getMasterSafeOf: jest
            .fn()
            .mockReturnValue({ address: DEFAULT_SAFE_ADDRESS }),
          isFetched: true,
        },
        creation: {
          data: {
            safeCreationDetails: { isSafeCreated: true },
            transferDetails: { isTransferComplete: false, transfers: [] },
          },
        },
      });
      const { result } = renderAndSettle();
      expect(result.current.isSafeCreationAndTransferCompleted).toBe(false);
    });

    it('is false when isTransferCompleted is true but isSafeCreated is false', () => {
      setupMocks({
        wallet: {
          getMasterSafeOf: jest.fn().mockReturnValue(undefined),
          isFetched: true,
        },
        creation: {
          data: {
            safeCreationDetails: { isSafeCreated: false },
            transferDetails: { isTransferComplete: true, transfers: [] },
          },
        },
      });
      const { result } = renderAndSettle();
      expect(result.current.isSafeCreationAndTransferCompleted).toBe(false);
    });

    it('is true when both isSafeCreated and isTransferCompleted are true', () => {
      setupMocks({
        wallet: {
          getMasterSafeOf: jest
            .fn()
            .mockReturnValue({ address: DEFAULT_SAFE_ADDRESS }),
          isFetched: true,
        },
        creation: {
          data: {
            safeCreationDetails: { isSafeCreated: true },
            transferDetails: { isTransferComplete: true, transfers: [] },
          },
        },
      });
      const { result } = renderAndSettle();
      expect(result.current.isSafeCreationAndTransferCompleted).toBe(true);
    });

    it('is falsy when no creation data exists', () => {
      setupMocks({
        wallet: {
          getMasterSafeOf: jest.fn().mockReturnValue(undefined),
          isFetched: true,
        },
      });
      const { result } = renderAndSettle();
      expect(result.current.isSafeCreationAndTransferCompleted).toBeFalsy();
    });
  });

  // -------------------------------------------------------------------------
  // masterSafeCreationDetails status derivation
  // -------------------------------------------------------------------------

  describe('masterSafeCreationDetails status derivation', () => {
    const setupForCreation = (overrides?: {
      bridging?: Partial<ReturnType<typeof defaultBridging>>;
      creation?: Partial<ReturnType<typeof defaultCreation>>;
      isRefillRequired?: boolean;
    }) => {
      setupMocks({
        wallet: {
          getMasterSafeOf: jest.fn().mockReturnValue(undefined),
          isFetched: true,
        },
        bridging: overrides?.bridging,
        creation: overrides?.creation,
      });
      return {
        ...defaultProps,
        mode: 'onboard' as const,
        isRefillRequired: overrides?.isRefillRequired ?? false,
      };
    };

    it('returns undefined when shouldCreateMasterSafe is false (deposit)', () => {
      setupMocks({
        wallet: {
          getMasterSafeOf: jest.fn().mockReturnValue(undefined),
          isFetched: true,
        },
      });
      const { result } = renderAndSettle({ ...defaultProps, mode: 'deposit' });
      expect(result.current.steps.masterSafeCreation).toBeUndefined();
    });

    it('returns wait status when isRefillRequired is true', () => {
      const props = setupForCreation({ isRefillRequired: true });
      const { result } = renderAndSettle(props);
      expect(result.current.steps.masterSafeCreation?.status).toBe('wait');
    });

    it('returns wait status when isBridging is true', () => {
      const props = setupForCreation({ bridging: { isBridging: true } });
      const { result } = renderAndSettle(props);
      expect(result.current.steps.masterSafeCreation?.status).toBe('wait');
    });

    it('returns wait status when isBridgingCompleted is false', () => {
      const props = setupForCreation({
        bridging: { isBridgingCompleted: false },
      });
      const { result } = renderAndSettle(props);
      expect(result.current.steps.masterSafeCreation?.status).toBe('wait');
    });

    it('returns error status when isErrorMasterSafeCreation is true', () => {
      const props = setupForCreation({
        bridging: { isBridgingCompleted: true },
        creation: { isError: true },
      });
      const { result } = renderAndSettle(props);
      expect(result.current.steps.masterSafeCreation?.status).toBe('error');
    });

    it('returns process status when isLoadingMasterSafeCreation is true', () => {
      const props = setupForCreation({
        bridging: { isBridgingCompleted: true },
        creation: { isPending: true },
      });
      const { result } = renderAndSettle(props);
      expect(result.current.steps.masterSafeCreation?.status).toBe('process');
    });

    it('returns finish status when isSafeCreated is true', () => {
      const props = setupForCreation({
        bridging: { isBridgingCompleted: true },
        creation: {
          data: {
            safeCreationDetails: { isSafeCreated: true },
            transferDetails: { isTransferComplete: false, transfers: [] },
          },
        },
      });
      const { result } = renderAndSettle(props);
      expect(result.current.steps.masterSafeCreation?.status).toBe('finish');
    });

    it('returns finish status when isTransferCompleted is true', () => {
      const props = setupForCreation({
        bridging: { isBridgingCompleted: true },
        creation: {
          data: {
            safeCreationDetails: { isSafeCreated: false },
            transferDetails: { isTransferComplete: true, transfers: [] },
          },
        },
      });
      const { result } = renderAndSettle(props);
      expect(result.current.steps.masterSafeCreation?.status).toBe('finish');
    });

    it('returns process as default when no specific condition matches', () => {
      const props = setupForCreation({
        bridging: { isBridgingCompleted: true },
      });
      const { result } = renderAndSettle(props);
      expect(result.current.steps.masterSafeCreation?.status).toBe('process');
    });

    it('includes subSteps with txnLink from creationAndTransferDetails', () => {
      const props = setupForCreation({
        bridging: { isBridgingCompleted: true },
        creation: {
          data: {
            safeCreationDetails: {
              isSafeCreated: true,
              txnLink: MOCK_TXN_LINK,
            },
            transferDetails: { isTransferComplete: false, transfers: [] },
          },
        },
      });
      const { result } = renderAndSettle(props);
      const subSteps = result.current.steps.masterSafeCreation?.subSteps;
      expect(subSteps).toHaveLength(1);
      expect(subSteps?.[0].txnLink).toBe(MOCK_TXN_LINK);
    });

    it('includes subSteps with null txnLink when no txnLink exists', () => {
      const props = setupForCreation({
        bridging: { isBridgingCompleted: true },
        creation: {
          data: {
            safeCreationDetails: { isSafeCreated: true },
            transferDetails: { isTransferComplete: false, transfers: [] },
          },
        },
      });
      const { result } = renderAndSettle(props);
      expect(
        result.current.steps.masterSafeCreation?.subSteps?.[0].txnLink,
      ).toBeNull();
    });

    it('subSteps include onRetry as createMasterSafe', () => {
      const props = setupForCreation({
        bridging: { isBridgingCompleted: true },
      });
      const { result } = renderAndSettle(props);
      expect(
        result.current.steps.masterSafeCreation?.subSteps?.[0].onRetry,
      ).toBe(mockCreateMasterSafe);
    });

    it('subSteps onRetryProps.isLoading is true when status is process', () => {
      const props = setupForCreation({
        bridging: { isBridgingCompleted: true },
      });
      const { result } = renderAndSettle(props);
      expect(
        result.current.steps.masterSafeCreation?.subSteps?.[0]?.onRetryProps
          ?.isLoading,
      ).toBe(true);
    });

    it('subSteps onRetryProps.isLoading is false when status is not process', () => {
      const props = setupForCreation({
        bridging: { isBridgingCompleted: true },
        creation: {
          data: {
            safeCreationDetails: { isSafeCreated: true },
            transferDetails: { isTransferComplete: true, transfers: [] },
          },
        },
      });
      const { result } = renderAndSettle(props);
      expect(
        result.current.steps.masterSafeCreation?.subSteps?.[0]?.onRetryProps
          ?.isLoading,
      ).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // masterSafeTransferDetails status derivation
  // -------------------------------------------------------------------------

  describe('masterSafeTransferDetails status derivation', () => {
    const setupForTransfer = (overrides?: {
      bridging?: Partial<ReturnType<typeof defaultBridging>>;
      creation?: Partial<ReturnType<typeof defaultCreation>>;
      isRefillRequired?: boolean;
    }) => {
      setupMocks({
        wallet: {
          getMasterSafeOf: jest.fn().mockReturnValue(undefined),
          isFetched: true,
        },
        bridging: overrides?.bridging,
        creation: overrides?.creation,
      });
      return {
        ...defaultProps,
        mode: 'onboard' as const,
        isRefillRequired: overrides?.isRefillRequired ?? false,
      };
    };

    it('returns undefined when shouldCreateMasterSafe is false (deposit)', () => {
      setupMocks({
        wallet: {
          getMasterSafeOf: jest.fn().mockReturnValue(undefined),
          isFetched: true,
        },
      });
      const { result } = renderAndSettle({ ...defaultProps, mode: 'deposit' });
      expect(result.current.steps.masterSafeTransfer).toBeUndefined();
    });

    it('returns wait status when isRefillRequired is true', () => {
      const props = setupForTransfer({
        isRefillRequired: true,
        bridging: { isBridgingCompleted: true },
      });
      const { result } = renderAndSettle(props);
      expect(result.current.steps.masterSafeTransfer?.status).toBe('wait');
    });

    it('returns error status when isErrorMasterSafeCreation is true', () => {
      const props = setupForTransfer({
        bridging: { isBridgingCompleted: true },
        creation: { isError: true },
      });
      const { result } = renderAndSettle(props);
      expect(result.current.steps.masterSafeTransfer?.status).toBe('error');
    });

    it('returns wait status when isBridging is true', () => {
      const props = setupForTransfer({
        bridging: { isBridging: true, isBridgingCompleted: true },
      });
      const { result } = renderAndSettle(props);
      expect(result.current.steps.masterSafeTransfer?.status).toBe('wait');
    });

    it('returns wait status when isBridgingCompleted is false', () => {
      const props = setupForTransfer({
        bridging: { isBridgingCompleted: false },
      });
      const { result } = renderAndSettle(props);
      expect(result.current.steps.masterSafeTransfer?.status).toBe('wait');
    });

    it('returns wait status when isSafeCreated is false', () => {
      const props = setupForTransfer({
        bridging: { isBridgingCompleted: true },
        creation: {
          data: {
            safeCreationDetails: { isSafeCreated: false },
            transferDetails: { isTransferComplete: false, transfers: [] },
          },
        },
      });
      const { result } = renderAndSettle(props);
      expect(result.current.steps.masterSafeTransfer?.status).toBe('wait');
    });

    it('returns finish status when isTransferCompleted and safe created', () => {
      const props = setupForTransfer({
        bridging: { isBridgingCompleted: true },
        creation: {
          data: {
            safeCreationDetails: { isSafeCreated: true },
            transferDetails: { isTransferComplete: true, transfers: [] },
          },
        },
      });
      const { result } = renderAndSettle(props);
      expect(result.current.steps.masterSafeTransfer?.status).toBe('finish');
    });

    it('returns wait when safe created but isTransferCompleted is false', () => {
      const props = setupForTransfer({
        bridging: { isBridgingCompleted: true },
        creation: {
          data: {
            safeCreationDetails: { isSafeCreated: true },
            transferDetails: { isTransferComplete: false, transfers: [] },
          },
        },
      });
      const { result } = renderAndSettle(props);
      expect(result.current.steps.masterSafeTransfer?.status).toBe('wait');
    });

    it('maps transfer subSteps from creationAndTransferDetails', () => {
      const transfers = [
        { symbol: 'ETH', status: 'finish', txnLink: MOCK_TXN_LINK },
        { symbol: 'OLAS', status: 'wait', txnLink: null },
      ];
      const props = setupForTransfer({
        bridging: { isBridgingCompleted: true },
        creation: {
          data: {
            safeCreationDetails: { isSafeCreated: true },
            transferDetails: { isTransferComplete: true, transfers },
          },
        },
      });
      const { result } = renderAndSettle(props);
      const subSteps = result.current.steps.masterSafeTransfer?.subSteps;
      expect(subSteps).toHaveLength(2);
      expect(subSteps?.[0].symbol).toBe('ETH');
      expect(subSteps?.[0].txnLink).toBe(MOCK_TXN_LINK);
      expect(subSteps?.[1].symbol).toBe('OLAS');
      expect(subSteps?.[1].txnLink).toBeNull();
    });

    it('returns empty subSteps when transfers is undefined', () => {
      const props = setupForTransfer({
        bridging: { isBridgingCompleted: true },
        creation: {
          data: {
            safeCreationDetails: { isSafeCreated: true },
            transferDetails: { isTransferComplete: true },
          },
        },
      });
      const { result } = renderAndSettle(props);
      expect(result.current.steps.masterSafeTransfer?.subSteps).toHaveLength(0);
    });

    it('subSteps include onRetry as createMasterSafe', () => {
      const transfers = [
        { symbol: 'ETH', status: 'finish', txnLink: MOCK_TXN_LINK },
      ];
      const props = setupForTransfer({
        bridging: { isBridgingCompleted: true },
        creation: {
          data: {
            safeCreationDetails: { isSafeCreated: true },
            transferDetails: { isTransferComplete: true, transfers },
          },
        },
      });
      const { result } = renderAndSettle(props);
      expect(
        result.current.steps.masterSafeTransfer?.subSteps?.[0].onRetry,
      ).toBe(mockCreateMasterSafe);
    });

    it('subSteps onRetryProps.isLoading reflects masterSafeCreation status', () => {
      const transfers = [
        { symbol: 'ETH', status: 'finish', txnLink: MOCK_TXN_LINK },
      ];
      const props = setupForTransfer({
        bridging: { isBridgingCompleted: true },
        creation: {
          data: {
            safeCreationDetails: { isSafeCreated: false },
            transferDetails: { isTransferComplete: false, transfers },
          },
        },
      });
      const { result } = renderAndSettle(props);
      expect(
        result.current.steps.masterSafeTransfer?.subSteps?.[0]?.onRetryProps
          ?.isLoading,
      ).toBe(true);
    });

    it('subSteps onRetryProps.isLoading is false when creation is finish', () => {
      const transfers = [
        { symbol: 'ETH', status: 'finish', txnLink: MOCK_TXN_LINK },
      ];
      const props = setupForTransfer({
        bridging: { isBridgingCompleted: true },
        creation: {
          data: {
            safeCreationDetails: { isSafeCreated: true },
            transferDetails: { isTransferComplete: true, transfers },
          },
        },
      });
      const { result } = renderAndSettle(props);
      expect(
        result.current.steps.masterSafeTransfer?.subSteps?.[0]?.onRetryProps
          ?.isLoading,
      ).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Steps in deposit mode
  // -------------------------------------------------------------------------

  describe('steps in deposit mode', () => {
    it('both masterSafeCreation and masterSafeTransfer are undefined', () => {
      setupMocks({
        wallet: {
          getMasterSafeOf: jest.fn().mockReturnValue(undefined),
          isFetched: true,
        },
      });
      const { result } = renderAndSettle({ ...defaultProps, mode: 'deposit' });
      expect(result.current.steps.masterSafeCreation).toBeUndefined();
      expect(result.current.steps.masterSafeTransfer).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // createMasterSafe effect
  // -------------------------------------------------------------------------

  describe('createMasterSafe effect', () => {
    it('calls createMasterSafe when all guards pass', () => {
      setupMocks({
        wallet: {
          getMasterSafeOf: jest.fn().mockReturnValue(undefined),
          isFetched: true,
        },
        bridging: { isBridgingCompleted: true },
      });
      renderAndSettle({ ...defaultProps, mode: 'onboard' });
      expect(mockCreateMasterSafe).toHaveBeenCalledTimes(1);
    });

    it('does not call when shouldCreateMasterSafe is false (deposit)', () => {
      setupMocks({
        wallet: {
          getMasterSafeOf: jest.fn().mockReturnValue(undefined),
          isFetched: true,
        },
        bridging: { isBridgingCompleted: true },
      });
      renderAndSettle({ ...defaultProps, mode: 'deposit' });
      expect(mockCreateMasterSafe).not.toHaveBeenCalled();
    });

    it('does not call when isRefillRequired is true', () => {
      setupMocks({
        wallet: {
          getMasterSafeOf: jest.fn().mockReturnValue(undefined),
          isFetched: true,
        },
        bridging: { isBridgingCompleted: true },
      });
      renderAndSettle({
        ...defaultProps,
        mode: 'onboard',
        isRefillRequired: true,
      });
      expect(mockCreateMasterSafe).not.toHaveBeenCalled();
    });

    it('does not call when isBridging is true', () => {
      setupMocks({
        wallet: {
          getMasterSafeOf: jest.fn().mockReturnValue(undefined),
          isFetched: true,
        },
        bridging: { isBridging: true },
      });
      renderAndSettle({ ...defaultProps, mode: 'onboard' });
      expect(mockCreateMasterSafe).not.toHaveBeenCalled();
    });

    it('does not call when isBridgingFailed is true', () => {
      setupMocks({
        wallet: {
          getMasterSafeOf: jest.fn().mockReturnValue(undefined),
          isFetched: true,
        },
        bridging: { isBridgingFailed: true },
      });
      renderAndSettle({ ...defaultProps, mode: 'onboard' });
      expect(mockCreateMasterSafe).not.toHaveBeenCalled();
    });

    it('does not call when isBridgingCompleted is false', () => {
      setupMocks({
        wallet: {
          getMasterSafeOf: jest.fn().mockReturnValue(undefined),
          isFetched: true,
        },
        bridging: { isBridgingCompleted: false },
      });
      renderAndSettle({ ...defaultProps, mode: 'onboard' });
      expect(mockCreateMasterSafe).not.toHaveBeenCalled();
    });

    it('does not call when isMasterWalletFetched is false', () => {
      setupMocks({
        wallet: { isFetched: false },
        bridging: { isBridgingCompleted: true },
      });
      renderAndSettle({ ...defaultProps, mode: 'onboard' });
      expect(mockCreateMasterSafe).not.toHaveBeenCalled();
    });

    it('does not call when isLoadingMasterSafeCreation is true', () => {
      setupMocks({
        wallet: {
          getMasterSafeOf: jest.fn().mockReturnValue(undefined),
          isFetched: true,
        },
        bridging: { isBridgingCompleted: true },
        creation: { isPending: true },
      });
      renderAndSettle({ ...defaultProps, mode: 'onboard' });
      expect(mockCreateMasterSafe).not.toHaveBeenCalled();
    });

    it('does not call when isErrorMasterSafeCreation is true', () => {
      setupMocks({
        wallet: {
          getMasterSafeOf: jest.fn().mockReturnValue(undefined),
          isFetched: true,
        },
        bridging: { isBridgingCompleted: true },
        creation: { isError: true },
      });
      renderAndSettle({ ...defaultProps, mode: 'onboard' });
      expect(mockCreateMasterSafe).not.toHaveBeenCalled();
    });

    it('does not call when isSafeCreated is already true', () => {
      setupMocks({
        wallet: {
          getMasterSafeOf: jest.fn().mockReturnValue(undefined),
          isFetched: true,
        },
        bridging: { isBridgingCompleted: true },
        creation: {
          data: {
            safeCreationDetails: { isSafeCreated: true },
            transferDetails: { isTransferComplete: false, transfers: [] },
          },
        },
      });
      renderAndSettle({ ...defaultProps, mode: 'onboard' });
      expect(mockCreateMasterSafe).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Passthrough values
  // -------------------------------------------------------------------------

  describe('passthrough values', () => {
    it('returns isLoadingMasterSafeCreation from the hook', () => {
      setupMocks({ creation: { isPending: true } });
      const { result } = renderAndSettle();
      expect(result.current.isLoadingMasterSafeCreation).toBe(true);
    });

    it('returns isMasterWalletFetched as true when fetched', () => {
      setupMocks({
        wallet: {
          getMasterSafeOf: jest.fn().mockReturnValue(undefined),
          isFetched: true,
        },
      });
      const { result } = renderAndSettle();
      expect(result.current.isMasterWalletFetched).toBe(true);
    });

    it('returns isMasterWalletFetched as false when not fetched', () => {
      setupMocks({ wallet: { isFetched: false } });
      const { result } = renderAndSettle();
      expect(result.current.isMasterWalletFetched).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Hook argument forwarding
  // -------------------------------------------------------------------------

  describe('hook argument forwarding', () => {
    it('calls useBridgingSteps with symbols and quoteId', () => {
      renderAndSettle();
      expect(mockUseBridgingSteps).toHaveBeenCalledWith(
        MOCK_SYMBOLS,
        MOCK_QUOTE_ID,
      );
    });

    it('calls useMasterSafeCreationAndTransfer with symbols', () => {
      renderAndSettle();
      expect(mockUseMasterSafeCreationAndTransfer).toHaveBeenCalledWith(
        MOCK_SYMBOLS,
      );
    });
  });

  // -------------------------------------------------------------------------
  // Re-render stability
  // -------------------------------------------------------------------------

  describe('createMasterSafe guard: isMasterWalletFetched goes false after ref is set', () => {
    it('does not call createMasterSafe when isMasterWalletFetched becomes false after ref is set', () => {
      // First render: set the ref by having wallet fetched and mode=onboard
      setupMocks({
        wallet: {
          getMasterSafeOf: jest.fn().mockReturnValue(undefined),
          isFetched: true,
        },
        bridging: { isBridgingCompleted: true },
      });
      const { rerender } = renderAndSettle({
        ...defaultProps,
        mode: 'onboard',
      });
      expect(mockCreateMasterSafe).toHaveBeenCalledTimes(1);

      // Now re-render with isFetched: false (wallet no longer fetched)
      mockCreateMasterSafe.mockClear();
      mockUseMasterWalletContext.mockReturnValue({
        getMasterSafeOf: jest.fn().mockReturnValue(undefined),
        isFetched: false,
      });
      rerender({ ...defaultProps, mode: 'onboard' });
      // shouldCreateMasterSafe is true (ref was set), but isMasterWalletFetched is now false
      expect(mockCreateMasterSafe).not.toHaveBeenCalled();
    });
  });

  describe('masterSafeTransferDetails: isBridging with isBridgingCompleted and isSafeCreated', () => {
    it('returns wait when isBridging is true even if isSafeCreated', () => {
      setupMocks({
        wallet: {
          getMasterSafeOf: jest.fn().mockReturnValue(undefined),
          isFetched: true,
        },
        bridging: { isBridging: true, isBridgingCompleted: true },
        creation: {
          data: {
            safeCreationDetails: { isSafeCreated: true },
            transferDetails: { isTransferComplete: false, transfers: [] },
          },
        },
      });
      const { result } = renderAndSettle({
        ...defaultProps,
        mode: 'onboard',
      });
      expect(result.current.steps.masterSafeTransfer?.status).toBe('wait');
    });
  });

  describe('re-render stability', () => {
    it('does not call createMasterSafe again when safe is now created', () => {
      setupMocks({
        wallet: {
          getMasterSafeOf: jest.fn().mockReturnValue(undefined),
          isFetched: true,
        },
        bridging: { isBridgingCompleted: true },
      });

      const { rerender } = renderAndSettle({
        ...defaultProps,
        mode: 'onboard',
      });
      expect(mockCreateMasterSafe).toHaveBeenCalledTimes(1);

      mockCreateMasterSafe.mockClear();
      mockUseMasterSafeCreationAndTransfer.mockReturnValue({
        ...defaultCreation(),
        data: {
          safeCreationDetails: { isSafeCreated: true },
          transferDetails: { isTransferComplete: false, transfers: [] },
        },
      });

      rerender({ ...defaultProps, mode: 'onboard' });
      expect(mockCreateMasterSafe).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // getMasterSafeOf chain argument
  // -------------------------------------------------------------------------

  describe('getMasterSafeOf chain argument', () => {
    it('calls getMasterSafeOf with selectedAgentConfig.evmHomeChainId', () => {
      const getMasterSafeOfMock = jest.fn().mockReturnValue(undefined);
      setupMocks({
        services: {
          selectedAgentConfig: { evmHomeChainId: EvmChainIdMap.Base },
        },
        wallet: {
          getMasterSafeOf: getMasterSafeOfMock,
          isFetched: true,
        },
      });
      renderAndSettle();
      expect(getMasterSafeOfMock).toHaveBeenCalledWith(EvmChainIdMap.Base);
    });
  });

  // -------------------------------------------------------------------------
  // masterSafeCreationDetails status priority
  // -------------------------------------------------------------------------

  describe('masterSafeCreationDetails status priority', () => {
    it('isRefillRequired takes priority over isBridging', () => {
      setupMocks({
        wallet: {
          getMasterSafeOf: jest.fn().mockReturnValue(undefined),
          isFetched: true,
        },
        bridging: { isBridging: true },
      });
      const { result } = renderAndSettle({
        ...defaultProps,
        mode: 'onboard',
        isRefillRequired: true,
      });
      expect(result.current.steps.masterSafeCreation?.status).toBe('wait');
    });

    it('error takes priority over isLoadingMasterSafeCreation', () => {
      setupMocks({
        wallet: {
          getMasterSafeOf: jest.fn().mockReturnValue(undefined),
          isFetched: true,
        },
        bridging: { isBridgingCompleted: true },
        creation: { isPending: true, isError: true },
      });
      const { result } = renderAndSettle({
        ...defaultProps,
        mode: 'onboard',
      });
      expect(result.current.steps.masterSafeCreation?.status).toBe('error');
    });

    it('isLoadingMasterSafeCreation takes priority over finish', () => {
      setupMocks({
        wallet: {
          getMasterSafeOf: jest.fn().mockReturnValue(undefined),
          isFetched: true,
        },
        bridging: { isBridgingCompleted: true },
        creation: {
          isPending: true,
          data: {
            safeCreationDetails: { isSafeCreated: true },
            transferDetails: { isTransferComplete: true, transfers: [] },
          },
        },
      });
      const { result } = renderAndSettle({
        ...defaultProps,
        mode: 'onboard',
      });
      expect(result.current.steps.masterSafeCreation?.status).toBe('process');
    });
  });

  // -------------------------------------------------------------------------
  // masterSafeTransferDetails status priority
  // -------------------------------------------------------------------------

  describe('masterSafeTransferDetails status priority', () => {
    it('isRefillRequired takes priority over error', () => {
      setupMocks({
        wallet: {
          getMasterSafeOf: jest.fn().mockReturnValue(undefined),
          isFetched: true,
        },
        bridging: { isBridgingCompleted: true },
        creation: { isError: true },
      });
      const { result } = renderAndSettle({
        ...defaultProps,
        mode: 'onboard',
        isRefillRequired: true,
      });
      expect(result.current.steps.masterSafeTransfer?.status).toBe('wait');
    });

    it('error takes priority over isBridging wait', () => {
      setupMocks({
        wallet: {
          getMasterSafeOf: jest.fn().mockReturnValue(undefined),
          isFetched: true,
        },
        bridging: { isBridging: true, isBridgingCompleted: true },
        creation: { isError: true },
      });
      const { result } = renderAndSettle({
        ...defaultProps,
        mode: 'onboard',
      });
      expect(result.current.steps.masterSafeTransfer?.status).toBe('error');
    });
  });
});
