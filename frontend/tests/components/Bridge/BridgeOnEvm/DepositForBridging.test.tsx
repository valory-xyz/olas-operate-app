import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { act, createElement } from 'react';

import { TokenSymbolMap } from '../../../../config/tokens';
import { AddressZero } from '../../../../constants/address';
import {
  AllEvmChainIdMap,
  MiddlewareChainMap,
} from '../../../../constants/chains';
import {
  BridgeRefillRequirementsResponse,
  CrossChainTransferDetails,
} from '../../../../types/Bridge';
import { DEFAULT_EOA_ADDRESS, makeMasterEoa } from '../../../helpers/factories';

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

// Mock styled-components so RootCard renders as a plain div
jest.mock('styled-components', () => {
  function StyledDiv(props: { children?: React.ReactNode }) {
    return createElement('div', { 'data-testid': 'root-card' }, props.children);
  }
  const styledComponent = () => StyledDiv;
  const withConfig = () => styledComponent;
  const handler = {
    get: () => {
      const taggedTemplate = () => {
        const comp = styledComponent;
        (comp as unknown as Record<string, unknown>).withConfig = withConfig;
        return comp;
      };
      taggedTemplate.withConfig = withConfig;
      return taggedTemplate;
    },
  };
  const styledFn = new Proxy(() => {
    const taggedTemplate = () => {
      const comp = styledComponent;
      (comp as unknown as Record<string, unknown>).withConfig = withConfig;
      return comp;
    };
    taggedTemplate.withConfig = withConfig;
    return taggedTemplate;
  }, handler);
  return { __esModule: true, default: styledFn };
});

// Mock UI components
jest.mock('../../../../components/ui', () => ({
  ERROR_ICON_STYLE: {},
  LoadingSpinner: () => createElement('div', { 'data-testid': 'spinner' }),
}));

jest.mock('../../../../components/ui/TokenRequirementsTable', () => ({
  TokenRequirementsTable: (props: Record<string, unknown>) => {
    return createElement('div', {
      'data-testid': 'token-table',
      'data-count': (props.tokensDataSource as unknown[])?.length ?? 0,
    });
  },
}));

// Mock antd message
const mockMessageSuccess = jest.fn();
const mockMessageDestroy = jest.fn();
jest.mock('antd', () => ({
  ...jest.requireActual('antd'),
  message: {
    success: mockMessageSuccess,
    destroy: mockMessageDestroy,
  },
}));

// Mock delayInSeconds from utils
const mockDelayInSeconds = jest.fn(() => Promise.resolve());
const mockAreAddressesEqual = jest.fn(
  (a?: string, b?: string) => a?.toLowerCase() === b?.toLowerCase(),
);
const mockAsEvmChainDetails = jest.fn((chain: string) => {
  if (chain === MiddlewareChainMap.ETHEREUM) {
    return {
      chainId: AllEvmChainIdMap.Ethereum,
      name: 'ethereum',
      displayName: 'Ethereum',
      symbol: TokenSymbolMap.ETH,
    };
  }
  if (chain === MiddlewareChainMap.GNOSIS) {
    return {
      chainId: 100,
      name: 'gnosis',
      displayName: 'Gnosis',
      symbol: TokenSymbolMap.XDAI,
    };
  }
  return {
    chainId: 1,
    name: 'ethereum',
    displayName: 'Ethereum',
    symbol: TokenSymbolMap.ETH,
  };
});
const mockAsEvmChainId = jest.fn((chain: string) => {
  if (chain === MiddlewareChainMap.GNOSIS) return 100;
  return 1;
});
const mockFormatUnitsToNumber = jest.fn(
  (val: bigint, dec: number) => Number(val) / 10 ** dec,
);
const mockGetTokenDetails = jest.fn(() => ({
  symbol: TokenSymbolMap.ETH,
  decimals: 18,
}));

jest.mock('../../../../utils', () => ({
  areAddressesEqual: mockAreAddressesEqual,
  asEvmChainDetails: mockAsEvmChainDetails,
  asEvmChainId: mockAsEvmChainId,
  delayInSeconds: mockDelayInSeconds,
  formatUnitsToNumber: mockFormatUnitsToNumber,
  getTokenDetails: mockGetTokenDetails,
}));

// Mock hooks
const mockRefetch = jest.fn(() => Promise.resolve({ data: null }));
const mockUseServices = jest.fn(() => ({ isLoading: false }));
const mockUseMasterWalletContext = jest.fn(
  () =>
    ({
      masterEoa: makeMasterEoa(),
      isFetched: true,
    }) as {
      masterEoa: ReturnType<typeof makeMasterEoa> | undefined;
      isFetched: boolean;
    },
);
const mockUseBalanceAndRefillRequirementsContext = jest.fn(() => ({
  isBalancesAndFundingRequirementsLoading: false,
}));
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mockUseBridgeRefillRequirements = jest.fn((_opts?: unknown) => ({
  data: undefined as BridgeRefillRequirementsResponse | undefined | null,
  isLoading: false,
  isError: false,
  isFetching: false,
  refetch: mockRefetch,
}));

jest.mock('../../../../hooks', () => ({
  useServices: () => mockUseServices(),
  useMasterWalletContext: () => mockUseMasterWalletContext(),
  useBalanceAndRefillRequirementsContext: () =>
    mockUseBalanceAndRefillRequirementsContext(),
  useBridgeRefillRequirements: (opts: unknown) =>
    mockUseBridgeRefillRequirements(opts),
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-var-requires */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {
  DepositForBridging,
} = require('../../../../components/Bridge/BridgeOnEvm/DepositForBridging');
/* eslint-enable @typescript-eslint/no-var-requires */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockGetBridgeRequirementsParams = jest.fn().mockReturnValue({
  bridge_requests: [
    {
      from: {
        chain: MiddlewareChainMap.ETHEREUM,
        address: DEFAULT_EOA_ADDRESS,
        token: AddressZero,
      },
      to: {
        chain: MiddlewareChainMap.GNOSIS,
        address: DEFAULT_EOA_ADDRESS,
        token: AddressZero,
        amount: '1000000000000000000',
      },
    },
  ],
  force_update: false,
});

const mockUpdateQuoteId = jest.fn();
const mockUpdateCrossChainTransferDetails = jest.fn();
const mockOnNext = jest.fn();

const defaultProps = {
  fromChain: MiddlewareChainMap.ETHEREUM,
  getBridgeRequirementsParams: mockGetBridgeRequirementsParams,
  updateQuoteId: mockUpdateQuoteId,
  updateCrossChainTransferDetails: mockUpdateCrossChainTransferDetails,
  onNext: mockOnNext,
  bridgeToChain: MiddlewareChainMap.GNOSIS,
};

const makeBridgeFundingRequirements = (
  overrides: Partial<BridgeRefillRequirementsResponse> = {},
): BridgeRefillRequirementsResponse => ({
  id: 'quote-123',
  balances: {},
  bridge_request_status: [{ status: 'QUOTE_DONE', eta: 300, message: null }],
  bridge_total_requirements: {
    [MiddlewareChainMap.ETHEREUM]: {
      [DEFAULT_EOA_ADDRESS]: {
        [AddressZero]: '1000000000000000000',
      },
    },
  },
  bridge_refill_requirements: {
    [MiddlewareChainMap.ETHEREUM]: {
      [DEFAULT_EOA_ADDRESS]: {
        [AddressZero]: '500000000000000000',
      },
    },
  },
  expiration_timestamp: Date.now() + 600_000,
  is_refill_required: true,
  ...overrides,
});

const renderComponent = (overrides: Record<string, unknown> = {}) =>
  render(createElement(DepositForBridging, { ...defaultProps, ...overrides }));

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();

  // Reset hook defaults
  mockUseServices.mockReturnValue({ isLoading: false });
  mockUseMasterWalletContext.mockReturnValue({
    masterEoa: makeMasterEoa(),
    isFetched: true,
  });
  mockUseBalanceAndRefillRequirementsContext.mockReturnValue({
    isBalancesAndFundingRequirementsLoading: false,
  });
  mockRefetch.mockResolvedValue({ data: null });
  mockUseBridgeRefillRequirements.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: mockRefetch,
  });
  mockDelayInSeconds.mockResolvedValue(undefined);
  mockGetBridgeRequirementsParams.mockReturnValue({
    bridge_requests: [
      {
        from: {
          chain: MiddlewareChainMap.ETHEREUM,
          address: DEFAULT_EOA_ADDRESS,
          token: AddressZero,
        },
        to: {
          chain: MiddlewareChainMap.GNOSIS,
          address: DEFAULT_EOA_ADDRESS,
          token: AddressZero,
          amount: '1000000000000000000',
        },
      },
    ],
    force_update: false,
  });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DepositForBridging', () => {
  // -------------------------------------------------------------------------
  // Rendering states
  // -------------------------------------------------------------------------
  describe('Rendering states', () => {
    it('shows RequestingQuote spinner when loading and no tokens', async () => {
      // Make refetch hang so isBridgeRefillRequirementsApiLoading stays true
      mockRefetch.mockReturnValue(new Promise(() => {}));

      await act(async () => {
        renderComponent();
      });

      expect(screen.getByText('Requesting quote...')).toBeInTheDocument();
      expect(screen.getByTestId('spinner')).toBeInTheDocument();
    });

    it('shows QuoteRequestFailed when API returns error', async () => {
      mockUseBridgeRefillRequirements.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        isFetching: false,
        refetch: mockRefetch,
      });
      // The initial mount refetch resolves, clearing isBridgeRefillRequirementsApiLoading
      mockRefetch.mockResolvedValue({ data: null });

      await act(async () => {
        renderComponent();
      });
      // Wait for the mount effect to resolve
      await act(async () => {
        await Promise.resolve();
      });

      expect(screen.getByText('Quote request failed')).toBeInTheDocument();
      expect(screen.getByText('Try again')).toBeInTheDocument();
    });

    it('shows QuoteRequestFailed when bridge_request_status has QUOTE_FAILED', async () => {
      const failedRequirements = makeBridgeFundingRequirements({
        bridge_request_status: [
          { status: 'QUOTE_FAILED', eta: 0, message: 'error' },
        ],
      });
      mockUseBridgeRefillRequirements.mockReturnValue({
        data: failedRequirements,
        isLoading: false,
        isError: false,
        isFetching: false,
        refetch: mockRefetch,
      });

      await act(async () => {
        renderComponent();
      });
      await act(async () => {
        await Promise.resolve();
      });

      expect(screen.getByText('Quote request failed')).toBeInTheDocument();
    });

    it('shows TokenRequirementsTable when tokens are available', async () => {
      const requirements = makeBridgeFundingRequirements();
      mockUseBridgeRefillRequirements.mockReturnValue({
        data: requirements,
        isLoading: false,
        isError: false,
        isFetching: false,
        refetch: mockRefetch,
      });

      await act(async () => {
        renderComponent();
      });
      await act(async () => {
        await Promise.resolve();
      });

      expect(screen.getByTestId('token-table')).toBeInTheDocument();
      expect(screen.getByTestId('token-table').getAttribute('data-count')).toBe(
        '1',
      );
    });

    it('shows TokenRequirementsTable with empty data when tokens list is empty but not loading', async () => {
      // Requirements exist but do not contain the expected chain/address
      const emptyRequirements = makeBridgeFundingRequirements({
        bridge_total_requirements: {},
        bridge_refill_requirements: {},
      });
      mockUseBridgeRefillRequirements.mockReturnValue({
        data: emptyRequirements,
        isLoading: false,
        isError: false,
        isFetching: false,
        refetch: mockRefetch,
      });

      await act(async () => {
        renderComponent();
      });
      await act(async () => {
        await Promise.resolve();
      });

      expect(screen.getByTestId('token-table')).toBeInTheDocument();
      expect(screen.getByTestId('token-table').getAttribute('data-count')).toBe(
        '0',
      );
    });
  });

  // -------------------------------------------------------------------------
  // isRequestingQuote derivation
  // -------------------------------------------------------------------------
  describe('isRequestingQuote derivation', () => {
    it('shows loading when isBalancesAndFundingRequirementsLoading is true', async () => {
      mockUseBalanceAndRefillRequirementsContext.mockReturnValue({
        isBalancesAndFundingRequirementsLoading: true,
      });
      // Need to also clear the mount loading to isolate this flag
      // But isBridgeRefillRequirementsApiLoading starts true anyway, so spinner shows
      await act(async () => {
        renderComponent();
      });

      expect(screen.getByText('Requesting quote...')).toBeInTheDocument();
    });

    it('shows loading when isBridgeRefillRequirementsApiLoading is true (initial state)', async () => {
      // Make refetch hang so isBridgeRefillRequirementsApiLoading stays true
      mockRefetch.mockReturnValue(new Promise(() => {}));

      await act(async () => {
        renderComponent();
      });

      expect(screen.getByText('Requesting quote...')).toBeInTheDocument();
    });

    it('shows loading when isBridgeRefillRequirementsLoading is true', async () => {
      mockUseBridgeRefillRequirements.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        isFetching: false,
        refetch: mockRefetch,
      });

      await act(async () => {
        renderComponent();
      });

      expect(screen.getByText('Requesting quote...')).toBeInTheDocument();
    });

    it('shows loading when isServicesLoading is true', async () => {
      mockUseServices.mockReturnValue({ isLoading: true });

      await act(async () => {
        renderComponent();
      });

      expect(screen.getByText('Requesting quote...')).toBeInTheDocument();
    });

    it('does not show loading spinner once all loading flags are false', async () => {
      const requirements = makeBridgeFundingRequirements();
      mockUseBridgeRefillRequirements.mockReturnValue({
        data: requirements,
        isLoading: false,
        isError: false,
        isFetching: false,
        refetch: mockRefetch,
      });

      await act(async () => {
        renderComponent();
      });
      await act(async () => {
        await Promise.resolve();
      });

      expect(screen.queryByText('Requesting quote...')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // quoteEta derivation
  // -------------------------------------------------------------------------
  describe('quoteEta derivation', () => {
    it('returns max ETA from QUOTE_DONE requests (verified via auto-advance)', async () => {
      // Set up all conditions for auto-advance to test quoteEta indirectly
      const requirements = makeBridgeFundingRequirements({
        bridge_request_status: [
          { status: 'QUOTE_DONE', eta: 300, message: null },
          { status: 'QUOTE_DONE', eta: 900, message: null },
        ],
        // All funds received: refill = 0
        bridge_refill_requirements: {
          [MiddlewareChainMap.ETHEREUM]: {
            [DEFAULT_EOA_ADDRESS]: {
              [AddressZero]: '0',
            },
          },
        },
        is_refill_required: false,
      });
      mockUseBridgeRefillRequirements.mockReturnValue({
        data: requirements,
        isLoading: false,
        isError: false,
        isFetching: false,
        refetch: mockRefetch,
      });

      await act(async () => {
        renderComponent();
      });
      await act(async () => {
        await Promise.resolve();
      });
      await act(async () => {
        await Promise.resolve();
      });

      // If quoteEta was computed correctly (max = 900), the auto-advance
      // effect would call updateCrossChainTransferDetails with eta: 900
      await waitFor(() => {
        expect(mockUpdateCrossChainTransferDetails).toHaveBeenCalled();
      });
      const transferDetails: CrossChainTransferDetails =
        mockUpdateCrossChainTransferDetails.mock.calls[0][0];
      expect(transferDetails.eta).toBe(900);
    });

    it('does not auto-advance when still requesting quote (quoteEta is undefined)', async () => {
      mockUseServices.mockReturnValue({ isLoading: true });
      const requirements = makeBridgeFundingRequirements({
        bridge_refill_requirements: {
          [MiddlewareChainMap.ETHEREUM]: {
            [DEFAULT_EOA_ADDRESS]: { [AddressZero]: '0' },
          },
        },
        is_refill_required: false,
      });
      mockUseBridgeRefillRequirements.mockReturnValue({
        data: requirements,
        isLoading: false,
        isError: false,
        isFetching: false,
        refetch: mockRefetch,
      });

      await act(async () => {
        renderComponent();
      });
      await act(async () => {
        await Promise.resolve();
      });

      expect(mockOnNext).not.toHaveBeenCalled();
    });

    it('does not auto-advance when no QUOTE_DONE requests (quoteEta is undefined)', async () => {
      const requirements = makeBridgeFundingRequirements({
        bridge_request_status: [{ status: 'CREATED', eta: 0, message: null }],
        bridge_refill_requirements: {
          [MiddlewareChainMap.ETHEREUM]: {
            [DEFAULT_EOA_ADDRESS]: { [AddressZero]: '0' },
          },
        },
        is_refill_required: false,
      });
      mockUseBridgeRefillRequirements.mockReturnValue({
        data: requirements,
        isLoading: false,
        isError: false,
        isFetching: false,
        refetch: mockRefetch,
      });

      await act(async () => {
        renderComponent();
      });
      await act(async () => {
        await Promise.resolve();
      });

      expect(mockOnNext).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // tokens derivation
  // -------------------------------------------------------------------------
  describe('tokens derivation', () => {
    it('returns empty when bridgeFundingRequirements is undefined', async () => {
      mockUseBridgeRefillRequirements.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
        isFetching: false,
        refetch: mockRefetch,
      });

      await act(async () => {
        renderComponent();
      });
      await act(async () => {
        await Promise.resolve();
      });

      // No token table rendered when data is empty and not loading
      // Actually with empty tokens and not loading, it renders TokenRequirementsTable with 0 items
      // But without data, tokens = [], so it depends on isRequestingQuote
      // After mount effect resolves, isRequestingQuote becomes false
      // With tokens empty and isRequestingQuote false, it renders TokenRequirementsTable
      expect(screen.getByTestId('token-table')).toBeInTheDocument();
      expect(screen.getByTestId('token-table').getAttribute('data-count')).toBe(
        '0',
      );
    });

    it('returns empty when masterEoa is undefined', async () => {
      mockUseMasterWalletContext.mockReturnValue({
        masterEoa: undefined as ReturnType<typeof makeMasterEoa> | undefined,
        isFetched: true,
      });
      const requirements = makeBridgeFundingRequirements();
      mockUseBridgeRefillRequirements.mockReturnValue({
        data: requirements,
        isLoading: false,
        isError: false,
        isFetching: false,
        refetch: mockRefetch,
      });

      await act(async () => {
        renderComponent();
      });
      await act(async () => {
        await Promise.resolve();
      });

      expect(screen.getByTestId('token-table')).toBeInTheDocument();
      expect(screen.getByTestId('token-table').getAttribute('data-count')).toBe(
        '0',
      );
    });

    it('returns empty when isMasterWalletFetched is false', async () => {
      mockUseMasterWalletContext.mockReturnValue({
        masterEoa: makeMasterEoa(),
        isFetched: false,
      });
      const requirements = makeBridgeFundingRequirements();
      mockUseBridgeRefillRequirements.mockReturnValue({
        data: requirements,
        isLoading: false,
        isError: false,
        isFetching: false,
        refetch: mockRefetch,
      });

      await act(async () => {
        renderComponent();
      });
      await act(async () => {
        await Promise.resolve();
      });

      expect(screen.getByTestId('token-table')).toBeInTheDocument();
      expect(screen.getByTestId('token-table').getAttribute('data-count')).toBe(
        '0',
      );
    });

    it('returns tokens for ERC20 addresses using areAddressesEqual fallback', async () => {
      const OLAS_ADDRESS = '0x0001A500A6B18995B03f44bb040A5fFc28E45CB0';
      const requirements = makeBridgeFundingRequirements({
        bridge_total_requirements: {
          [MiddlewareChainMap.ETHEREUM]: {
            [DEFAULT_EOA_ADDRESS]: {
              [OLAS_ADDRESS]: '2000000000000000000',
            },
          },
        },
        bridge_refill_requirements: {
          [MiddlewareChainMap.ETHEREUM]: {
            [DEFAULT_EOA_ADDRESS]: {
              [OLAS_ADDRESS]: '1000000000000000000',
            },
          },
        },
      });
      mockUseBridgeRefillRequirements.mockReturnValue({
        data: requirements,
        isLoading: false,
        isError: false,
        isFetching: false,
        refetch: mockRefetch,
      });

      await act(async () => {
        renderComponent();
      });
      await act(async () => {
        await Promise.resolve();
      });

      expect(screen.getByTestId('token-table')).toBeInTheDocument();
      expect(screen.getByTestId('token-table').getAttribute('data-count')).toBe(
        '1',
      );
    });

    it('throws when token address does not match any known token config', async () => {
      const UNKNOWN_TOKEN = '0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF';
      // Make areAddressesEqual always return false so no token matches
      mockAreAddressesEqual.mockReturnValue(false);

      const requirements = makeBridgeFundingRequirements({
        bridge_total_requirements: {
          [MiddlewareChainMap.ETHEREUM]: {
            [DEFAULT_EOA_ADDRESS]: {
              [UNKNOWN_TOKEN]: '1000000000000000000',
            },
          },
        },
        bridge_refill_requirements: {
          [MiddlewareChainMap.ETHEREUM]: {
            [DEFAULT_EOA_ADDRESS]: {
              [UNKNOWN_TOKEN]: '500000000000000000',
            },
          },
        },
      });
      mockUseBridgeRefillRequirements.mockReturnValue({
        data: requirements,
        isLoading: false,
        isError: false,
        isFetching: false,
        refetch: mockRefetch,
      });

      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      await expect(async () => {
        await act(async () => {
          renderComponent();
        });
        await act(async () => {
          await Promise.resolve();
        });
      }).rejects.toThrow(
        `Failed to get the token info for the following token address: ${UNKNOWN_TOKEN}`,
      );

      consoleSpy.mockRestore();
    });

    it('maps token data correctly from requirements', async () => {
      const requirements = makeBridgeFundingRequirements();
      mockUseBridgeRefillRequirements.mockReturnValue({
        data: requirements,
        isLoading: false,
        isError: false,
        isFetching: false,
        refetch: mockRefetch,
      });

      await act(async () => {
        renderComponent();
      });
      await act(async () => {
        await Promise.resolve();
      });

      expect(screen.getByTestId('token-table')).toBeInTheDocument();
      expect(screen.getByTestId('token-table').getAttribute('data-count')).toBe(
        '1',
      );
      // Verify formatUnitsToNumber was called for the token amounts
      expect(mockFormatUnitsToNumber).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Retry behavior
  // -------------------------------------------------------------------------
  describe('Retry behavior', () => {
    it('shows "Try again" button when quote failed', async () => {
      mockUseBridgeRefillRequirements.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        isFetching: false,
        refetch: mockRefetch,
      });

      await act(async () => {
        renderComponent();
      });
      await act(async () => {
        await Promise.resolve();
      });

      expect(screen.getByText('Try again')).toBeInTheDocument();
    });

    it('handleRetryAgain triggers refetch when clicking Try again', async () => {
      mockUseBridgeRefillRequirements.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        isFetching: false,
        refetch: mockRefetch,
      });

      await act(async () => {
        renderComponent();
      });
      await act(async () => {
        await Promise.resolve();
      });

      const tryAgainButton = screen.getByText('Try again');
      await act(async () => {
        fireEvent.click(tryAgainButton);
      });
      // Let delayInSeconds resolve
      await act(async () => {
        await Promise.resolve();
      });

      // delayInSeconds(1) is called first, then refetch
      expect(mockDelayInSeconds).toHaveBeenCalledWith(1);
      // refetch is called: once on mount + once on retry
      expect(mockRefetch).toHaveBeenCalledTimes(2);
    });

    it('calls getBridgeRequirementsParams with forceUpdate after retry', async () => {
      mockUseBridgeRefillRequirements.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        isFetching: false,
        refetch: mockRefetch,
      });

      await act(async () => {
        renderComponent();
      });
      await act(async () => {
        await Promise.resolve();
      });

      const tryAgainButton = screen.getByText('Try again');
      await act(async () => {
        fireEvent.click(tryAgainButton);
      });
      await act(async () => {
        await Promise.resolve();
      });
      // After retry, the component re-renders with isForceUpdate=true
      // The getBridgeRequirementsParams is called in useMemo with isForceUpdate
      // On mount it was called with false, after click with true
      expect(mockGetBridgeRequirementsParams).toHaveBeenCalledWith(true);
    });
  });

  // -------------------------------------------------------------------------
  // Auto-advance effect
  // -------------------------------------------------------------------------
  describe('Auto-advance effect', () => {
    it('does NOT call onNext when still requesting quote', async () => {
      mockUseServices.mockReturnValue({ isLoading: true });

      await act(async () => {
        renderComponent();
      });
      await act(async () => {
        await Promise.resolve();
      });

      expect(mockOnNext).not.toHaveBeenCalled();
    });

    it('does NOT call onNext when tokens length is 0', async () => {
      // Data exists but no matching tokens for the chain/address
      const requirements = makeBridgeFundingRequirements({
        bridge_total_requirements: {},
        bridge_refill_requirements: {},
      });
      mockUseBridgeRefillRequirements.mockReturnValue({
        data: requirements,
        isLoading: false,
        isError: false,
        isFetching: false,
        refetch: mockRefetch,
      });

      await act(async () => {
        renderComponent();
      });
      await act(async () => {
        await Promise.resolve();
      });

      expect(mockOnNext).not.toHaveBeenCalled();
    });

    it('does NOT call onNext when not all funds received', async () => {
      // pendingAmount > 0, so areFundsReceived = false
      const requirements = makeBridgeFundingRequirements({
        is_refill_required: true,
      });
      mockUseBridgeRefillRequirements.mockReturnValue({
        data: requirements,
        isLoading: false,
        isError: false,
        isFetching: false,
        refetch: mockRefetch,
      });

      await act(async () => {
        renderComponent();
      });
      await act(async () => {
        await Promise.resolve();
      });

      expect(mockOnNext).not.toHaveBeenCalled();
    });

    it('does NOT call onNext when isBridgeRefillRequirementsFetching is true', async () => {
      const requirements = makeBridgeFundingRequirements({
        bridge_refill_requirements: {
          [MiddlewareChainMap.ETHEREUM]: {
            [DEFAULT_EOA_ADDRESS]: { [AddressZero]: '0' },
          },
        },
        is_refill_required: false,
      });
      mockUseBridgeRefillRequirements.mockReturnValue({
        data: requirements,
        isLoading: false,
        isError: false,
        isFetching: true,
        refetch: mockRefetch,
      });

      await act(async () => {
        renderComponent();
      });
      await act(async () => {
        await Promise.resolve();
      });

      expect(mockOnNext).not.toHaveBeenCalled();
    });

    it('does NOT call onNext when isRequestingQuoteFailed is true', async () => {
      const failedRequirements = makeBridgeFundingRequirements({
        bridge_request_status: [
          { status: 'QUOTE_FAILED', eta: 0, message: 'error' },
        ],
        bridge_refill_requirements: {
          [MiddlewareChainMap.ETHEREUM]: {
            [DEFAULT_EOA_ADDRESS]: { [AddressZero]: '0' },
          },
        },
        is_refill_required: false,
      });
      mockUseBridgeRefillRequirements.mockReturnValue({
        data: failedRequirements,
        isLoading: false,
        isError: false,
        isFetching: false,
        refetch: mockRefetch,
      });

      await act(async () => {
        renderComponent();
      });
      await act(async () => {
        await Promise.resolve();
      });

      expect(mockOnNext).not.toHaveBeenCalled();
    });

    it('does NOT call onNext when bridge_requests params are null', async () => {
      const requirements = makeBridgeFundingRequirements({
        bridge_refill_requirements: {
          [MiddlewareChainMap.ETHEREUM]: {
            [DEFAULT_EOA_ADDRESS]: { [AddressZero]: '0' },
          },
        },
        is_refill_required: false,
      });
      mockUseBridgeRefillRequirements.mockReturnValue({
        data: requirements,
        isLoading: false,
        isError: false,
        isFetching: false,
        refetch: mockRefetch,
      });
      mockGetBridgeRequirementsParams.mockReturnValue(null);

      await act(async () => {
        renderComponent();
      });
      await act(async () => {
        await Promise.resolve();
      });

      expect(mockOnNext).not.toHaveBeenCalled();
    });

    it('calls updateQuoteId, updateCrossChainTransferDetails, and onNext when all conditions met', async () => {
      const requirements = makeBridgeFundingRequirements({
        bridge_refill_requirements: {
          [MiddlewareChainMap.ETHEREUM]: {
            [DEFAULT_EOA_ADDRESS]: {
              [AddressZero]: '0',
            },
          },
        },
        is_refill_required: false,
      });
      mockUseBridgeRefillRequirements.mockReturnValue({
        data: requirements,
        isLoading: false,
        isError: false,
        isFetching: false,
        refetch: mockRefetch,
      });

      await act(async () => {
        renderComponent();
      });
      // Let mount refetch settle
      await act(async () => {
        await Promise.resolve();
      });
      // Let state updates propagate
      await act(async () => {
        await Promise.resolve();
      });
      // Let the auto-advance effect fire
      await act(async () => {
        await Promise.resolve();
      });
      // Let delayInSeconds(2) promise resolve
      await act(async () => {
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(mockUpdateQuoteId).toHaveBeenCalledWith('quote-123');
      });
      expect(mockUpdateCrossChainTransferDetails).toHaveBeenCalledWith(
        expect.objectContaining({
          fromChain: MiddlewareChainMap.ETHEREUM,
          toChain: MiddlewareChainMap.GNOSIS,
          eta: 300,
        }),
      );
      expect(mockMessageSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Funds received, proceeding to next step...',
        }),
      );
      // onNext called after delayInSeconds(2) resolves
      await waitFor(() => {
        expect(mockOnNext).toHaveBeenCalledTimes(1);
      });
    });
  });

  // -------------------------------------------------------------------------
  // Auto-advance when toTokenDetails or toTokenConfig is missing
  // -------------------------------------------------------------------------
  describe('Auto-advance edge cases', () => {
    it('does NOT call onNext when masterEoa.address is undefined', async () => {
      mockUseMasterWalletContext.mockReturnValue({
        masterEoa: undefined,
        isFetched: true,
      });
      const requirements = makeBridgeFundingRequirements({
        bridge_refill_requirements: {
          [MiddlewareChainMap.ETHEREUM]: {
            [DEFAULT_EOA_ADDRESS]: { [AddressZero]: '0' },
          },
        },
        is_refill_required: false,
      });
      mockUseBridgeRefillRequirements.mockReturnValue({
        data: requirements,
        isLoading: false,
        isError: false,
        isFetching: false,
        refetch: mockRefetch,
      });

      await act(async () => {
        renderComponent();
      });
      await act(async () => {
        await Promise.resolve();
      });

      expect(mockOnNext).not.toHaveBeenCalled();
    });

    it('does NOT call onNext when isMasterWalletFetched is false in auto-advance', async () => {
      mockUseMasterWalletContext.mockReturnValue({
        masterEoa: makeMasterEoa(),
        isFetched: false,
      });
      const requirements = makeBridgeFundingRequirements({
        bridge_refill_requirements: {
          [MiddlewareChainMap.ETHEREUM]: {
            [DEFAULT_EOA_ADDRESS]: { [AddressZero]: '0' },
          },
        },
        is_refill_required: false,
      });
      mockUseBridgeRefillRequirements.mockReturnValue({
        data: requirements,
        isLoading: false,
        isError: false,
        isFetching: false,
        refetch: mockRefetch,
      });

      await act(async () => {
        renderComponent();
      });
      await act(async () => {
        await Promise.resolve();
      });

      expect(mockOnNext).not.toHaveBeenCalled();
    });

    it('skips transfer entries when getTokenDetails returns null', async () => {
      mockGetTokenDetails.mockReturnValueOnce(
        null as unknown as { symbol: 'ETH'; decimals: number },
      );
      const requirements = makeBridgeFundingRequirements({
        bridge_refill_requirements: {
          [MiddlewareChainMap.ETHEREUM]: {
            [DEFAULT_EOA_ADDRESS]: { [AddressZero]: '0' },
          },
        },
        is_refill_required: false,
      });
      mockUseBridgeRefillRequirements.mockReturnValue({
        data: requirements,
        isLoading: false,
        isError: false,
        isFetching: false,
        refetch: mockRefetch,
      });

      await act(async () => {
        renderComponent();
      });
      await act(async () => {
        await Promise.resolve();
      });
      await act(async () => {
        await Promise.resolve();
      });

      // Should still advance but with empty transfers array
      await waitFor(() => {
        expect(mockUpdateCrossChainTransferDetails).toHaveBeenCalled();
      });
      const details: CrossChainTransferDetails =
        mockUpdateCrossChainTransferDetails.mock.calls[0][0];
      expect(details.transfers).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // getBridgeRequirementsParams null
  // -------------------------------------------------------------------------
  describe('getBridgeRequirementsParams null', () => {
    it('passes null params when getBridgeRequirementsParams returns null', async () => {
      mockGetBridgeRequirementsParams.mockReturnValue(null);
      await act(async () => {
        renderComponent();
      });
      // The useMemo should return null, passed to useBridgeRefillRequirements
      expect(mockUseBridgeRefillRequirements).toHaveBeenCalledWith(
        expect.objectContaining({ params: null }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // Mount refetch effect
  // -------------------------------------------------------------------------
  describe('Mount refetch effect', () => {
    it('calls refetch on mount to clear stale values', async () => {
      await act(async () => {
        renderComponent();
      });

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it('does not call refetch again after initial mount resolution', async () => {
      await act(async () => {
        renderComponent();
      });
      await act(async () => {
        await Promise.resolve();
      });

      // Only called once on mount
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // Stop polling when quote fails
  // -------------------------------------------------------------------------
  describe('Polling control', () => {
    it('passes canPoll to useBridgeRefillRequirements', async () => {
      await act(async () => {
        renderComponent();
      });

      expect(mockUseBridgeRefillRequirements).toHaveBeenCalledWith(
        expect.objectContaining({ canPoll: true }),
      );
    });
  });
});
