import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';

import { EvmChainIdMap } from '../../../../constants/chains';
import { useBalanceAndRefillRequirementsContext } from '../../../../hooks/useBalanceAndRefillRequirementsContext';
import { useBridgeRefillRequirements } from '../../../../hooks/useBridgeRefillRequirements';
import { BridgeRefillRequirementsResponse } from '../../../../types/Bridge';

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

jest.mock('../../../../hooks/useBalanceAndRefillRequirementsContext', () => ({
  useBalanceAndRefillRequirementsContext: jest.fn(),
}));
jest.mock('../../../../hooks/useBridgeRefillRequirements', () => ({
  useBridgeRefillRequirements: jest.fn(),
}));

const mockGetReceivingTokens = jest.fn().mockReturnValue([]);
const mockGetTokensToBeBridged = jest.fn().mockReturnValue([]);
const mockGetBridgeParamsExceptNativeToken = jest.fn().mockReturnValue(null);

jest.mock(
  '../../../../components/OnRamp/hooks/useBridgeRequirementsUtils',
  () => ({
    useBridgeRequirementsUtils: jest.fn(() => ({
      getReceivingTokens: mockGetReceivingTokens,
      getTokensToBeBridged: mockGetTokensToBeBridged,
      getBridgeParamsExceptNativeToken: mockGetBridgeParamsExceptNativeToken,
    })),
  }),
);

jest.mock('../../../../utils/delay', () => ({
  delayInSeconds: jest.fn(() => Promise.resolve()),
}));

// ---------------------------------------------------------------------------
// Typed mock accessors
// ---------------------------------------------------------------------------

const mockUseBalanceAndRefillRequirementsContext =
  useBalanceAndRefillRequirementsContext as jest.MockedFunction<
    typeof useBalanceAndRefillRequirementsContext
  >;
const mockUseBridgeRefillRequirements =
  useBridgeRefillRequirements as jest.MockedFunction<
    typeof useBridgeRefillRequirements
  >;

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-var-requires */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {
  useBridgeRequirementsQuery,
} = require('../../../../components/OnRamp/PayingReceivingTable/useBridgeRequirementsQuery');
/* eslint-enable @typescript-eslint/no-var-requires */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockRefetch = jest.fn().mockResolvedValue(undefined);

const makeDefaultBridgeRefillReturn = (
  overrides: Partial<{
    data: BridgeRefillRequirementsResponse | undefined;
    isLoading: boolean;
    isError: boolean;
  }> = {},
) => ({
  data: overrides.data ?? undefined,
  isLoading: overrides.isLoading ?? false,
  isError: overrides.isError ?? false,
  refetch: mockRefetch,
});

const makeBridgeFundingRequirements = (
  overrides: Partial<{
    id: string;
    bridge_request_status: Array<{ status: string; eta?: number }>;
  }> = {},
): BridgeRefillRequirementsResponse =>
  ({
    id: overrides.id ?? 'quote-123',
    bridge_request_status: overrides.bridge_request_status ?? [
      { status: 'QUOTE_DONE', eta: 300 },
    ],
    bridge_total_requirements: {},
    bridge_refill_requirements: {},
    is_refill_required: false,
  }) as unknown as BridgeRefillRequirementsResponse;

const mockGetOnRampRequirementsParams = jest.fn((forceUpdate: boolean) => ({
  bridge_requests: [],
  force_update: forceUpdate,
}));

const setupMocks = (
  overrides: {
    isBalancesLoading?: boolean;
    bridgeRefillOverrides?: Parameters<typeof makeDefaultBridgeRefillReturn>[0];
  } = {},
) => {
  mockUseBalanceAndRefillRequirementsContext.mockReturnValue({
    isBalancesAndFundingRequirementsLoading:
      overrides.isBalancesLoading ?? false,
  } as ReturnType<typeof useBalanceAndRefillRequirementsContext>);

  mockUseBridgeRefillRequirements.mockReturnValue(
    makeDefaultBridgeRefillReturn(
      overrides.bridgeRefillOverrides,
    ) as unknown as ReturnType<typeof useBridgeRefillRequirements>,
  );
};

const renderQuery = (
  overrides: {
    enabled?: boolean;
    stopPollingCondition?: boolean;
    getOnRampRequirementsParams?: jest.Mock | null;
  } = {},
) =>
  renderHook(() =>
    useBridgeRequirementsQuery({
      onRampChainId: EvmChainIdMap.Base,
      getOnRampRequirementsParams:
        'getOnRampRequirementsParams' in overrides
          ? overrides.getOnRampRequirementsParams
          : mockGetOnRampRequirementsParams,
      enabled: overrides.enabled ?? true,
      stopPollingCondition: overrides.stopPollingCondition ?? false,
      queryKeySuffix: 'test',
    }),
  );

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useBridgeRequirementsQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRefetch.mockResolvedValue(undefined);
  });

  describe('isLoading', () => {
    it('is true when balances are loading', () => {
      setupMocks({ isBalancesLoading: true });
      const { result } = renderQuery();
      expect(result.current.isLoading).toBe(true);
    });

    it('is true when bridge refill requirements are loading', () => {
      setupMocks({
        bridgeRefillOverrides: { isLoading: true },
      });
      const { result } = renderQuery();
      expect(result.current.isLoading).toBe(true);
    });

    it('is true initially due to isBridgeRefillRequirementsApiLoading', () => {
      setupMocks();
      const { result } = renderQuery();
      // On first render, isBridgeRefillRequirementsApiLoading is true
      expect(result.current.isLoading).toBe(true);
    });

    it('becomes false after initial refetch resolves', async () => {
      setupMocks();
      const { result } = renderQuery();
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('hasError', () => {
    it('is true when bridge refill requirements has error', () => {
      setupMocks({
        bridgeRefillOverrides: { isError: true },
      });
      const { result } = renderQuery();
      expect(result.current.hasError).toBe(true);
    });

    it('is true when any quote status is QUOTE_FAILED', async () => {
      const fundingReqs = makeBridgeFundingRequirements({
        bridge_request_status: [
          { status: 'QUOTE_DONE' },
          { status: 'QUOTE_FAILED' },
        ],
      });
      setupMocks({
        bridgeRefillOverrides: { data: fundingReqs },
      });
      const { result } = renderQuery();
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.hasError).toBe(true);
    });

    it('is false when all quotes succeed', async () => {
      const fundingReqs = makeBridgeFundingRequirements({
        bridge_request_status: [{ status: 'QUOTE_DONE' }],
      });
      setupMocks({
        bridgeRefillOverrides: { data: fundingReqs },
      });
      const { result } = renderQuery();
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.hasError).toBe(false);
    });

    it('is false when bridgeFundingRequirements is undefined', async () => {
      setupMocks();
      const { result } = renderQuery();
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.hasError).toBe(false);
    });
  });

  describe('bridgeParams', () => {
    it('returns null when getOnRampRequirementsParams is null', () => {
      setupMocks();
      const { result } = renderQuery({
        getOnRampRequirementsParams: null,
      });
      expect(result.current.bridgeParams).toBeNull();
    });

    it('calls getOnRampRequirementsParams with false initially', () => {
      setupMocks();
      renderQuery();
      expect(mockGetOnRampRequirementsParams).toHaveBeenCalledWith(false);
    });
  });

  describe('receivingTokens and tokensToBeBridged', () => {
    it('delegates to useBridgeRequirementsUtils.getReceivingTokens', () => {
      const expectedTokens = [{ symbol: 'ETH', amount: 0.01 }];
      mockGetReceivingTokens.mockReturnValue(expectedTokens);
      setupMocks();
      const { result } = renderQuery();
      expect(result.current.receivingTokens).toEqual(expectedTokens);
    });

    it('delegates to useBridgeRequirementsUtils.getTokensToBeBridged', () => {
      const expectedTokens = ['ETH', 'OLAS'];
      mockGetTokensToBeBridged.mockReturnValue(expectedTokens);
      setupMocks();
      const { result } = renderQuery();
      expect(result.current.tokensToBeBridged).toEqual(expectedTokens);
    });
  });

  describe('bridgeFundingRequirements passthrough', () => {
    it('passes through data from useBridgeRefillRequirements', () => {
      const fundingReqs = makeBridgeFundingRequirements();
      setupMocks({
        bridgeRefillOverrides: { data: fundingReqs },
      });
      const { result } = renderQuery();
      expect(result.current.bridgeFundingRequirements).toBe(fundingReqs);
    });
  });

  describe('polling config', () => {
    it('passes canPoll as true when enabled and stopPollingCondition is false', () => {
      setupMocks();
      renderQuery({ enabled: true, stopPollingCondition: false });
      const callArgs = mockUseBridgeRefillRequirements.mock.calls[0][0];
      expect(callArgs.canPoll).toBe(true);
    });

    it('passes canPoll as false when stopPollingCondition is true', () => {
      setupMocks();
      renderQuery({ stopPollingCondition: true });
      const callArgs = mockUseBridgeRefillRequirements.mock.calls[0][0];
      expect(callArgs.canPoll).toBe(false);
    });

    it('passes queryKeySuffix to useBridgeRefillRequirements', () => {
      setupMocks();
      renderQuery();
      const callArgs = mockUseBridgeRefillRequirements.mock.calls[0][0];
      expect(callArgs.queryKeySuffix).toBe('test');
    });
  });

  describe('onRetry', () => {
    it('calls refetch after setting force update', async () => {
      setupMocks();
      const { result } = renderQuery();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.onRetry();
      });

      // refetch called: once on mount + once on retry
      expect(mockRefetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('initial refetch on mount', () => {
    it('calls refetch on mount', () => {
      setupMocks();
      renderQuery();
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });
});
