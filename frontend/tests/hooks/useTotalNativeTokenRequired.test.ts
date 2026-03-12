import { renderHook } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Import SUT and mocked modules (after mocks are registered)
// ---------------------------------------------------------------------------
import { useBridgeRequirementsQuery } from '../../components/OnRamp/PayingReceivingTable/useBridgeRequirementsQuery';
import { AddressZero } from '../../constants/address';
import { EvmChainIdMap, MiddlewareChainMap } from '../../constants/chains';
import { useOnRampContext } from '../../hooks/useOnRampContext';
import { useTotalNativeTokenRequired } from '../../hooks/useTotalNativeTokenRequired';
import { useMasterWalletContext } from '../../hooks/useWallet';
import { BridgeRefillRequirementsResponse } from '../../types/Bridge';
import { DEFAULT_EOA_ADDRESS, makeMasterEoa } from '../helpers/factories';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../constants/providers', () => ({}));
jest.mock('../../config/providers', () => ({ providers: [] }));

const mockUpdateNativeAmountToPay = jest.fn();
const mockUpdateNativeTotalAmountRequired = jest.fn();

jest.mock('../../hooks/useOnRampContext', () => ({
  useOnRampContext: jest.fn(() => ({
    updateNativeAmountToPay: mockUpdateNativeAmountToPay,
    updateNativeTotalAmountRequired: mockUpdateNativeTotalAmountRequired,
    isOnRampingTransactionSuccessful: false,
    isBuyCryptoBtnLoading: false,
  })),
}));

jest.mock('../../hooks/useWallet', () => ({
  useMasterWalletContext: jest.fn(() => ({
    masterEoa: makeMasterEoa(),
    isFetched: true,
  })),
}));

const mockOnRetry = jest.fn();

jest.mock(
  '../../components/OnRamp/PayingReceivingTable/useBridgeRequirementsQuery',
  () => ({
    useBridgeRequirementsQuery: jest.fn(() => ({
      isLoading: false,
      hasError: false,
      bridgeParams: null,
      bridgeFundingRequirements: null,
      receivingTokens: [],
      onRetry: mockOnRetry,
    })),
  }),
);

const mockedUseOnRampContext = useOnRampContext as jest.MockedFunction<
  typeof useOnRampContext
>;
const mockedUseMasterWalletContext =
  useMasterWalletContext as jest.MockedFunction<typeof useMasterWalletContext>;
const mockedUseBridgeRequirementsQuery =
  useBridgeRequirementsQuery as jest.MockedFunction<
    typeof useBridgeRequirementsQuery
  >;

// ---------------------------------------------------------------------------
// Test data builders
// ---------------------------------------------------------------------------

/** Realistic wei string: 5 ETH equivalent for bridged non-native tokens */
const NON_NATIVE_BRIDGE_REQUIREMENT = '5000000000000000000';
/** 0.01 ETH gas for native token */
const NATIVE_TOKEN_AMOUNT = '10000000000000000';
/** 0.001 ETH existing balance */
const EXISTING_BALANCE = '1000000000000000';

const BASE_CHAIN = MiddlewareChainMap.BASE;
const GNOSIS_CHAIN = MiddlewareChainMap.GNOSIS;

/**
 * Builds a minimal BridgeRefillRequirementsResponse with configurable
 * refill/total requirements, balances, and bridge requests.
 */
const makeBridgeFundingRequirements = (
  overrides: {
    chain?: typeof BASE_CHAIN | typeof GNOSIS_CHAIN;
    refillRequirement?: string;
    totalRequirement?: string;
    balance?: string;
  } = {},
): BridgeRefillRequirementsResponse => {
  const chain = overrides.chain ?? BASE_CHAIN;
  const refillReq =
    overrides.refillRequirement ?? NON_NATIVE_BRIDGE_REQUIREMENT;
  const totalReq = overrides.totalRequirement ?? NON_NATIVE_BRIDGE_REQUIREMENT;
  const bal = overrides.balance ?? EXISTING_BALANCE;

  return {
    id: 'test-quote-id',
    balances: {
      [chain]: {
        [DEFAULT_EOA_ADDRESS]: {
          [AddressZero]: bal,
        },
      },
    },
    bridge_total_requirements: {
      [chain]: {
        [DEFAULT_EOA_ADDRESS]: {
          [AddressZero]: totalReq,
        },
      },
    },
    bridge_refill_requirements: {
      [chain]: {
        [DEFAULT_EOA_ADDRESS]: {
          [AddressZero]: refillReq,
        },
      },
    },
    bridge_request_status: [{ message: null, status: 'QUOTE_DONE', eta: 300 }],
    expiration_timestamp: Date.now() + 60_000,
    is_refill_required: true,
  };
};

/**
 * Builds bridge params with a native token request for the given chain.
 */
const makeBridgeParams = (
  toChain: typeof BASE_CHAIN | typeof GNOSIS_CHAIN = BASE_CHAIN,
  nativeAmount: string = NATIVE_TOKEN_AMOUNT,
) => ({
  bridge_requests: [
    {
      from: {
        chain: BASE_CHAIN,
        address: DEFAULT_EOA_ADDRESS,
        token: DEFAULT_EOA_ADDRESS, // non-native token
      },
      to: {
        chain: toChain,
        address: DEFAULT_EOA_ADDRESS,
        token: AddressZero, // native token
        amount: nativeAmount,
      },
    },
  ],
  force_update: false,
});

/** No-op requirements params function */
const mockGetOnRampRequirementsParams = jest.fn(() => null);

/** Default hook args for Base -> Gnosis cross-chain scenario */
const defaultCrossChainArgs = [
  EvmChainIdMap.Base,
  EvmChainIdMap.Gnosis,
  mockGetOnRampRequirementsParams,
] as const;

/** Default hook args for Base -> Base same-chain scenario */
const defaultSameChainArgs = [
  EvmChainIdMap.Base,
  EvmChainIdMap.Base,
  mockGetOnRampRequirementsParams,
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Sets up bridge query mock with the given overrides. */
const setupBridgeQuery = (
  overrides: Partial<ReturnType<typeof useBridgeRequirementsQuery>> = {},
) => {
  mockedUseBridgeRequirementsQuery.mockReturnValue({
    isLoading: false,
    hasError: false,
    bridgeParams: null,
    bridgeFundingRequirements: null,
    receivingTokens: [],
    tokensToBeBridged: [],
    onRetry: mockOnRetry,
    ...overrides,
  });
};

/** Sets up on-ramp context mock with the given overrides. */
const setupOnRampContext = (
  overrides: Partial<ReturnType<typeof useOnRampContext>> = {},
) => {
  mockedUseOnRampContext.mockReturnValue({
    updateNativeAmountToPay: mockUpdateNativeAmountToPay,
    updateNativeTotalAmountRequired: mockUpdateNativeTotalAmountRequired,
    isOnRampingTransactionSuccessful: false,
    isBuyCryptoBtnLoading: false,
    ...overrides,
  } as ReturnType<typeof useOnRampContext>);
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useTotalNativeTokenRequired', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset defaults
    setupOnRampContext();
    setupBridgeQuery();
    mockedUseMasterWalletContext.mockReturnValue({
      masterEoa: makeMasterEoa(),
      isFetched: true,
    } as ReturnType<typeof useMasterWalletContext>);
  });

  // -------------------------------------------------------------------------
  // Early returns (undefined computation)
  // -------------------------------------------------------------------------

  describe('early returns (undefined computation)', () => {
    it('returns totalNativeToken: 0 when bridgeFundingRequirements is undefined', () => {
      setupBridgeQuery({ bridgeFundingRequirements: undefined });

      const { result } = renderHook(() =>
        useTotalNativeTokenRequired(...defaultCrossChainArgs),
      );

      expect(result.current.totalNativeToken).toBe(0);
    });

    it('returns totalNativeToken: 0 when masterEoa is undefined', () => {
      setupBridgeQuery({
        bridgeFundingRequirements: makeBridgeFundingRequirements(),
      });
      mockedUseMasterWalletContext.mockReturnValue({
        masterEoa: undefined,
        isFetched: true,
      } as ReturnType<typeof useMasterWalletContext>);

      const { result } = renderHook(() =>
        useTotalNativeTokenRequired(...defaultCrossChainArgs),
      );

      expect(result.current.totalNativeToken).toBe(0);
    });

    it('returns totalNativeToken: 0 when isMasterWalletFetched is false', () => {
      setupBridgeQuery({
        bridgeFundingRequirements: makeBridgeFundingRequirements(),
      });
      mockedUseMasterWalletContext.mockReturnValue({
        masterEoa: makeMasterEoa(),
        isFetched: false,
      } as ReturnType<typeof useMasterWalletContext>);

      const { result } = renderHook(() =>
        useTotalNativeTokenRequired(...defaultCrossChainArgs),
      );

      expect(result.current.totalNativeToken).toBe(0);
    });

    it('returns totalNativeToken: 0 when both bridgeRequirementsOfNonNativeTokens and nativeTokenFromBridgeParams are falsy', () => {
      // Create requirements with no AddressZero entry for the address
      const emptyRequirements: BridgeRefillRequirementsResponse = {
        id: 'test-quote-id',
        balances: {},
        bridge_total_requirements: {},
        bridge_refill_requirements: {},
        bridge_request_status: [],
        expiration_timestamp: Date.now() + 60_000,
        is_refill_required: false,
      };

      setupBridgeQuery({
        bridgeFundingRequirements: emptyRequirements,
        bridgeParams: null,
      });

      const { result } = renderHook(() =>
        useTotalNativeTokenRequired(...defaultCrossChainArgs),
      );

      expect(result.current.totalNativeToken).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // Computation logic -- onboard mode (uses bridge_refill_requirements)
  // -------------------------------------------------------------------------

  describe('computation logic -- onboard mode', () => {
    it('computes total from bridge_refill_requirements for non-native tokens', () => {
      setupBridgeQuery({
        bridgeFundingRequirements: makeBridgeFundingRequirements({
          refillRequirement: NON_NATIVE_BRIDGE_REQUIREMENT,
          balance: '0',
        }),
      });

      const { result } = renderHook(() =>
        useTotalNativeTokenRequired(...defaultCrossChainArgs),
      );

      // 5 ETH from refill requirements, no native token (cross-chain), 0 balance
      // formatUnitsToNumber('5000000000000000000', 18) = 5.0
      expect(result.current.totalNativeToken).toBe(5);
    });

    it('adds native token amount from bridgeParams when toChainId === onRampChainId (same chain)', () => {
      setupBridgeQuery({
        bridgeFundingRequirements: makeBridgeFundingRequirements({
          refillRequirement: NON_NATIVE_BRIDGE_REQUIREMENT,
          balance: '0',
        }),
        bridgeParams: makeBridgeParams(BASE_CHAIN, NATIVE_TOKEN_AMOUNT),
      });

      const { result } = renderHook(() =>
        useTotalNativeTokenRequired(...defaultSameChainArgs),
      );

      // 5 ETH refill + 0.01 ETH native = 5.01 ETH
      expect(result.current.totalNativeToken).toBe(5.01);
    });

    it('does NOT add native token from bridgeParams when chains differ', () => {
      setupBridgeQuery({
        bridgeFundingRequirements: makeBridgeFundingRequirements({
          refillRequirement: NON_NATIVE_BRIDGE_REQUIREMENT,
          balance: '0',
        }),
        bridgeParams: makeBridgeParams(BASE_CHAIN, NATIVE_TOKEN_AMOUNT),
      });

      const { result } = renderHook(() =>
        useTotalNativeTokenRequired(...defaultCrossChainArgs),
      );

      // Only the 5 ETH refill requirement, native token ignored because chains differ
      expect(result.current.totalNativeToken).toBe(5);
    });

    it('adds existing balance to totalNativeTokenRequired (but not to totalNativeTokenToPay)', () => {
      setupBridgeQuery({
        bridgeFundingRequirements: makeBridgeFundingRequirements({
          refillRequirement: NON_NATIVE_BRIDGE_REQUIREMENT,
          balance: EXISTING_BALANCE,
        }),
      });

      const { result } = renderHook(() =>
        useTotalNativeTokenRequired(...defaultCrossChainArgs),
      );

      // totalNativeTokenToPay = 5 ETH (refill only, no native since cross-chain)
      // totalNativeTokenRequired = 5 ETH + 0.001 ETH balance = 5.001 ETH
      // The hook returns totalNativeTokenToPay, not totalNativeTokenRequired
      expect(result.current.totalNativeToken).toBe(5);

      // But updateNativeTotalAmountRequired should be called with 5.001
      expect(mockUpdateNativeTotalAmountRequired).toHaveBeenCalledWith(5.001);
    });

    it('returns totalNativeTokenToPay as totalNativeToken, not totalNativeTokenRequired', () => {
      setupBridgeQuery({
        bridgeFundingRequirements: makeBridgeFundingRequirements({
          refillRequirement: NON_NATIVE_BRIDGE_REQUIREMENT,
          balance: EXISTING_BALANCE,
        }),
      });

      const { result } = renderHook(() =>
        useTotalNativeTokenRequired(...defaultCrossChainArgs),
      );

      // totalNativeTokenToPay = 5 ETH
      expect(result.current.totalNativeToken).toBe(5);
      // totalNativeTokenRequired = 5 + 0.001 = 5.001
      // They should differ -- proving totalNativeToken is the "toPay" value
      expect(mockUpdateNativeAmountToPay).toHaveBeenCalledWith(5);
      expect(mockUpdateNativeTotalAmountRequired).toHaveBeenCalledWith(5.001);
    });
  });

  // -------------------------------------------------------------------------
  // Computation logic -- deposit mode (uses bridge_total_requirements)
  // -------------------------------------------------------------------------

  describe('computation logic -- deposit mode', () => {
    it('uses bridge_total_requirements instead of bridge_refill_requirements', () => {
      const fundingRequirements = makeBridgeFundingRequirements({
        refillRequirement: '1000000000000000000', // 1 ETH refill
        totalRequirement: '8000000000000000000', // 8 ETH total
        balance: '0',
      });

      setupBridgeQuery({
        bridgeFundingRequirements: fundingRequirements,
      });

      const { result } = renderHook(() =>
        useTotalNativeTokenRequired(
          EvmChainIdMap.Base,
          EvmChainIdMap.Gnosis,
          mockGetOnRampRequirementsParams,
          'deposit',
        ),
      );

      // Should use total_requirements (8 ETH), not refill (1 ETH)
      expect(result.current.totalNativeToken).toBe(8);
    });
  });

  // -------------------------------------------------------------------------
  // Freeze / unfreeze logic
  // -------------------------------------------------------------------------

  describe('freeze / unfreeze logic', () => {
    it('freezes totals when isBuyCryptoBtnLoading is true', () => {
      setupBridgeQuery({
        bridgeFundingRequirements: makeBridgeFundingRequirements({
          balance: '0',
        }),
      });

      const { result, rerender } = renderHook(
        ({ isLoading }: { isLoading: boolean }) => {
          // Update the context mock before hook runs
          setupOnRampContext({ isBuyCryptoBtnLoading: isLoading });
          return useTotalNativeTokenRequired(...defaultCrossChainArgs);
        },
        { initialProps: { isLoading: false } },
      );

      // Initial value computed
      expect(result.current.totalNativeToken).toBe(5);

      // Now freeze by setting loading to true
      rerender({ isLoading: true });

      // Value should be frozen at 5
      expect(result.current.totalNativeToken).toBe(5);
    });

    it('freezes totals when isOnRampingTransactionSuccessful is true', () => {
      setupBridgeQuery({
        bridgeFundingRequirements: makeBridgeFundingRequirements({
          balance: '0',
        }),
      });

      const { result, rerender } = renderHook(
        ({ isSuccess }: { isSuccess: boolean }) => {
          setupOnRampContext({ isOnRampingTransactionSuccessful: isSuccess });
          return useTotalNativeTokenRequired(...defaultCrossChainArgs);
        },
        { initialProps: { isSuccess: false } },
      );

      expect(result.current.totalNativeToken).toBe(5);

      // Freeze
      rerender({ isSuccess: true });

      expect(result.current.totalNativeToken).toBe(5);
    });

    it('returns frozen values even when bridge data changes after freeze', () => {
      const originalRequirements = makeBridgeFundingRequirements({
        refillRequirement: NON_NATIVE_BRIDGE_REQUIREMENT, // 5 ETH
        balance: '0',
      });
      const updatedRequirements = makeBridgeFundingRequirements({
        refillRequirement: '9000000000000000000', // 9 ETH
        balance: '0',
      });

      setupBridgeQuery({
        bridgeFundingRequirements: originalRequirements,
      });

      const { result, rerender } = renderHook(
        ({
          isLoading,
          requirements,
        }: {
          isLoading: boolean;
          requirements: BridgeRefillRequirementsResponse;
        }) => {
          setupOnRampContext({ isBuyCryptoBtnLoading: isLoading });
          setupBridgeQuery({ bridgeFundingRequirements: requirements });
          return useTotalNativeTokenRequired(...defaultCrossChainArgs);
        },
        {
          initialProps: {
            isLoading: false,
            requirements: originalRequirements,
          },
        },
      );

      // Initial: 5 ETH
      expect(result.current.totalNativeToken).toBe(5);

      // Freeze
      rerender({ isLoading: true, requirements: originalRequirements });
      expect(result.current.totalNativeToken).toBe(5);

      // Change data while frozen -- should still return 5 (frozen)
      rerender({ isLoading: true, requirements: updatedRequirements });
      expect(result.current.totalNativeToken).toBe(5);
    });

    it('unfreezes (resets ref) when shouldFreezeTotals goes false', () => {
      const originalRequirements = makeBridgeFundingRequirements({
        refillRequirement: NON_NATIVE_BRIDGE_REQUIREMENT, // 5 ETH
        balance: '0',
      });
      const updatedRequirements = makeBridgeFundingRequirements({
        refillRequirement: '9000000000000000000', // 9 ETH
        balance: '0',
      });

      setupBridgeQuery({
        bridgeFundingRequirements: originalRequirements,
      });

      const { result, rerender } = renderHook(
        ({
          isLoading,
          requirements,
        }: {
          isLoading: boolean;
          requirements: BridgeRefillRequirementsResponse;
        }) => {
          setupOnRampContext({ isBuyCryptoBtnLoading: isLoading });
          setupBridgeQuery({ bridgeFundingRequirements: requirements });
          return useTotalNativeTokenRequired(...defaultCrossChainArgs);
        },
        {
          initialProps: {
            isLoading: false,
            requirements: originalRequirements,
          },
        },
      );

      // Initial: 5 ETH
      expect(result.current.totalNativeToken).toBe(5);

      // Freeze
      rerender({ isLoading: true, requirements: originalRequirements });
      expect(result.current.totalNativeToken).toBe(5);

      // Unfreeze with updated data -- should now recompute
      rerender({ isLoading: false, requirements: updatedRequirements });
      expect(result.current.totalNativeToken).toBe(9);
    });

    it('does NOT call updateNativeAmountToPay while frozen', () => {
      setupBridgeQuery({
        bridgeFundingRequirements: makeBridgeFundingRequirements({
          balance: '0',
        }),
      });

      const { rerender } = renderHook(
        ({ isLoading }: { isLoading: boolean }) => {
          setupOnRampContext({ isBuyCryptoBtnLoading: isLoading });
          return useTotalNativeTokenRequired(...defaultCrossChainArgs);
        },
        { initialProps: { isLoading: false } },
      );

      // Called once during initial render
      expect(mockUpdateNativeAmountToPay).toHaveBeenCalledTimes(1);
      mockUpdateNativeAmountToPay.mockClear();

      // Freeze
      rerender({ isLoading: true });

      // Should NOT be called again while frozen
      expect(mockUpdateNativeAmountToPay).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Context updates
  // -------------------------------------------------------------------------

  describe('context updates', () => {
    it('calls updateNativeAmountToPay with totalNativeTokenToPay', () => {
      setupBridgeQuery({
        bridgeFundingRequirements: makeBridgeFundingRequirements({
          refillRequirement: NON_NATIVE_BRIDGE_REQUIREMENT,
          balance: '0',
        }),
      });

      renderHook(() => useTotalNativeTokenRequired(...defaultCrossChainArgs));

      expect(mockUpdateNativeAmountToPay).toHaveBeenCalledWith(5);
    });

    it('calls updateNativeTotalAmountRequired with totalNativeTokenRequired', () => {
      setupBridgeQuery({
        bridgeFundingRequirements: makeBridgeFundingRequirements({
          refillRequirement: NON_NATIVE_BRIDGE_REQUIREMENT,
          balance: EXISTING_BALANCE,
        }),
      });

      renderHook(() => useTotalNativeTokenRequired(...defaultCrossChainArgs));

      // totalNativeTokenRequired = 5 ETH + 0.001 ETH = 5.001 ETH
      expect(mockUpdateNativeTotalAmountRequired).toHaveBeenCalledWith(5.001);
    });

    it('does NOT call update functions when totalNativeTokens is undefined', () => {
      // No funding requirements means computation returns undefined
      setupBridgeQuery({ bridgeFundingRequirements: undefined });

      renderHook(() => useTotalNativeTokenRequired(...defaultCrossChainArgs));

      expect(mockUpdateNativeAmountToPay).not.toHaveBeenCalled();
      expect(mockUpdateNativeTotalAmountRequired).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Bridge query configuration
  // -------------------------------------------------------------------------

  describe('bridge query configuration', () => {
    it('passes enabled: !isOnRampingTransactionSuccessful to useBridgeRequirementsQuery', () => {
      setupOnRampContext({ isOnRampingTransactionSuccessful: true });

      renderHook(() => useTotalNativeTokenRequired(...defaultCrossChainArgs));

      expect(mockedUseBridgeRequirementsQuery).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: false }),
      );
    });

    it('passes stopPollingCondition: isOnRampingTransactionSuccessful to useBridgeRequirementsQuery', () => {
      setupOnRampContext({ isOnRampingTransactionSuccessful: true });

      renderHook(() => useTotalNativeTokenRequired(...defaultCrossChainArgs));

      expect(mockedUseBridgeRequirementsQuery).toHaveBeenCalledWith(
        expect.objectContaining({ stopPollingCondition: true }),
      );
    });

    it('passes queryKeySuffix matching the mode argument', () => {
      renderHook(() =>
        useTotalNativeTokenRequired(
          EvmChainIdMap.Base,
          EvmChainIdMap.Gnosis,
          mockGetOnRampRequirementsParams,
          'deposit',
        ),
      );

      expect(mockedUseBridgeRequirementsQuery).toHaveBeenCalledWith(
        expect.objectContaining({ queryKeySuffix: 'deposit' }),
      );
    });

    it('defaults queryKeySuffix to "onboard" when mode is not specified', () => {
      renderHook(() =>
        useTotalNativeTokenRequired(
          EvmChainIdMap.Base,
          EvmChainIdMap.Gnosis,
          mockGetOnRampRequirementsParams,
        ),
      );

      expect(mockedUseBridgeRequirementsQuery).toHaveBeenCalledWith(
        expect.objectContaining({ queryKeySuffix: 'onboard' }),
      );
    });

    it('passes onRampChainId and getOnRampRequirementsParams to useBridgeRequirementsQuery', () => {
      renderHook(() => useTotalNativeTokenRequired(...defaultCrossChainArgs));

      expect(mockedUseBridgeRequirementsQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          onRampChainId: EvmChainIdMap.Base,
          getOnRampRequirementsParams: mockGetOnRampRequirementsParams,
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // Passthrough values
  // -------------------------------------------------------------------------

  describe('passthrough values from useBridgeRequirementsQuery', () => {
    it('returns isLoading from useBridgeRequirementsQuery', () => {
      setupBridgeQuery({ isLoading: true });

      const { result } = renderHook(() =>
        useTotalNativeTokenRequired(...defaultCrossChainArgs),
      );

      expect(result.current.isLoading).toBe(true);
    });

    it('returns hasError from useBridgeRequirementsQuery', () => {
      setupBridgeQuery({ hasError: true });

      const { result } = renderHook(() =>
        useTotalNativeTokenRequired(...defaultCrossChainArgs),
      );

      expect(result.current.hasError).toBe(true);
    });

    it('returns receivingTokens from useBridgeRequirementsQuery', () => {
      const receivingTokens = [{ amount: 5, symbol: 'ETH' as const }];
      setupBridgeQuery({ receivingTokens });

      const { result } = renderHook(() =>
        useTotalNativeTokenRequired(...defaultCrossChainArgs),
      );

      expect(result.current.receivingTokens).toBe(receivingTokens);
    });

    it('returns onRetry from useBridgeRequirementsQuery', () => {
      const { result } = renderHook(() =>
        useTotalNativeTokenRequired(...defaultCrossChainArgs),
      );

      expect(result.current.onRetry).toBe(mockOnRetry);
    });
  });

  // -------------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------------

  describe('edge cases', () => {
    it('handles only native token from bridge params (no non-native requirements)', () => {
      // Requirements exist but have no AddressZero entry for the address
      const requirementsWithNoNonNative: BridgeRefillRequirementsResponse = {
        id: 'test-id',
        balances: {},
        bridge_total_requirements: {},
        bridge_refill_requirements: {},
        bridge_request_status: [],
        expiration_timestamp: Date.now() + 60_000,
        is_refill_required: true,
      };

      setupBridgeQuery({
        bridgeFundingRequirements: requirementsWithNoNonNative,
        bridgeParams: makeBridgeParams(BASE_CHAIN, NATIVE_TOKEN_AMOUNT),
      });

      // Same-chain so native token from bridge params is included
      const { result } = renderHook(() =>
        useTotalNativeTokenRequired(...defaultSameChainArgs),
      );

      // Only the 0.01 ETH native token amount
      expect(result.current.totalNativeToken).toBe(0.01);
    });

    it('computes zero totalNativeTokenToPay as 0 (not formatted)', () => {
      // Bridge requirements exist but all values are '0'
      const zeroRequirements: BridgeRefillRequirementsResponse = {
        id: 'test-id',
        balances: {
          [BASE_CHAIN]: {
            [DEFAULT_EOA_ADDRESS]: { [AddressZero]: '0' },
          },
        },
        bridge_total_requirements: {},
        bridge_refill_requirements: {
          [BASE_CHAIN]: {
            [DEFAULT_EOA_ADDRESS]: { [AddressZero]: '0' },
          },
        },
        bridge_request_status: [],
        expiration_timestamp: Date.now() + 60_000,
        is_refill_required: false,
      };

      setupBridgeQuery({
        bridgeFundingRequirements: zeroRequirements,
        // No bridgeParams → nativeTokenFromBridgeParams will be undefined
      });

      const { result } = renderHook(() =>
        useTotalNativeTokenRequired(...defaultCrossChainArgs),
      );

      // Both bridgeRequirementsOfNonNativeTokens ('0' is truthy as string) and
      // nativeTokenFromBridgeParams (0) — '0' is truthy so we proceed.
      // BigInt('0') + BigInt(0) = 0n → formatUnitsToNumber returns 0
      // But the ternary checks if totalNativeTokenToPay is truthy — 0n is falsy → returns 0
      expect(result.current.totalNativeToken).toBe(0);
    });

    it('handles missing balance gracefully (nativeBalance is undefined)', () => {
      const requirementsNoBalance: BridgeRefillRequirementsResponse = {
        id: 'test-id',
        balances: {}, // no balance for base chain
        bridge_total_requirements: {},
        bridge_refill_requirements: {
          [BASE_CHAIN]: {
            [DEFAULT_EOA_ADDRESS]: {
              [AddressZero]: NON_NATIVE_BRIDGE_REQUIREMENT,
            },
          },
        },
        bridge_request_status: [],
        expiration_timestamp: Date.now() + 60_000,
        is_refill_required: true,
      };

      setupBridgeQuery({
        bridgeFundingRequirements: requirementsNoBalance,
      });

      const { result } = renderHook(() =>
        useTotalNativeTokenRequired(...defaultCrossChainArgs),
      );

      // totalNativeTokenToPay = 5 ETH, totalNativeTokenRequired = 5 ETH + 0 = 5 ETH
      expect(result.current.totalNativeToken).toBe(5);
      expect(mockUpdateNativeAmountToPay).toHaveBeenCalledWith(5);
      expect(mockUpdateNativeTotalAmountRequired).toHaveBeenCalledWith(5);
    });
  });
});
