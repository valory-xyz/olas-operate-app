import { renderHook } from '@testing-library/react';

import { TokenSymbol } from '../../config/tokens';
import { FIVE_SECONDS_INTERVAL } from '../../constants/intervals';
import { BridgeStatusResponse, QuoteStatus } from '../../types/Bridge';

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

const mockUseOnlineStatusContext = jest.fn();
jest.mock('../../hooks/useOnlineStatus', () => ({
  useOnlineStatusContext: () => mockUseOnlineStatusContext(),
}));

const mockExecuteBridge = jest.fn();
const mockGetBridgeStatus = jest.fn();
jest.mock('../../service/Bridge', () => ({
  BridgeService: {
    executeBridge: (id: string, signal?: AbortSignal) =>
      mockExecuteBridge(id, signal),
    getBridgeStatus: (id: string) => mockGetBridgeStatus(id),
  },
}));

const mockDelayInSeconds = jest
  .fn<Promise<void>, [number]>()
  .mockResolvedValue(undefined);
jest.mock('../../utils/delay', () => ({
  delayInSeconds: (seconds: number) => mockDelayInSeconds(seconds),
}));

// ---------------------------------------------------------------------------
// Mock @tanstack/react-query — capture configs for both useQuery calls
// ---------------------------------------------------------------------------

type QueryConfig = {
  queryKey: unknown[];
  queryFn: (ctx?: { signal?: AbortSignal }) => Promise<unknown>;
  enabled: boolean;
  retry?: boolean;
  refetchOnWindowFocus?: boolean;
  refetchInterval: number | false;
};

let capturedExecuteConfig: QueryConfig | null = null;
let capturedStatusConfig: QueryConfig | null = null;

// State for execute query
let mockExecuteQueryState = {
  isLoading: false,
  isFetching: false,
  isError: false,
  data: undefined as BridgeStatusResponse | undefined,
};

// State for status query
let mockStatusQueryState = {
  isLoading: false,
  isError: false,
  data: undefined as BridgeStatusResponse | undefined,
};

jest.mock('@tanstack/react-query', () => ({
  useQuery: (config: QueryConfig) => {
    const key = config.queryKey;

    // Differentiate between execute and status queries by their key prefix
    if (Array.isArray(key) && key[0] === 'bridgeExecute') {
      capturedExecuteConfig = config;
      return {
        isLoading: mockExecuteQueryState.isLoading,
        isFetching: mockExecuteQueryState.isFetching,
        isError: mockExecuteQueryState.isError,
        data: mockExecuteQueryState.data,
      };
    }

    // Status query
    capturedStatusConfig = config;
    return {
      isLoading: mockStatusQueryState.isLoading,
      isError: mockStatusQueryState.isError,
      data: mockStatusQueryState.data,
    };
  },
}));

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

const MOCK_QUOTE_ID = 'rb-36c6cbe0-1841-4de3-b9f6-873305a833f5';
const TOKEN_SYMBOLS: TokenSymbol[] = ['ETH', 'USDC'];

const makeRequestStatus = (
  status: QuoteStatus,
  explorerLink?: string | null,
  txHash?: string | null,
): BridgeStatusResponse['bridge_request_status'][number] => ({
  status,
  explorer_link:
    explorerLink ?? `https://explorer.example.com/tx/${txHash ?? '0xabc'}`,
  message: null,
  tx_hash:
    txHash ??
    '0xabc123def456abc123def456abc123def456abc123def456abc123def456abc1',
});

const makeBridgeResponse = (
  statuses: BridgeStatusResponse['bridge_request_status'],
): BridgeStatusResponse => ({
  id: MOCK_QUOTE_ID,
  status: 'EXECUTION_PENDING',
  bridge_request_status: statuses,
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const resetQueryStates = () => {
  mockExecuteQueryState = {
    isLoading: false,
    isFetching: false,
    isError: false,
    data: undefined,
  };
  mockStatusQueryState = {
    isLoading: false,
    isError: false,
    data: undefined,
  };
  capturedExecuteConfig = null;
  capturedStatusConfig = null;
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const { useBridgingSteps } = require('../../hooks/useBridgingSteps');

describe('useBridgingSteps', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetQueryStates();
    mockUseOnlineStatusContext.mockReturnValue({ isOnline: true });
  });

  // -------------------------------------------------------------------------
  // Execute query configuration
  // -------------------------------------------------------------------------

  describe('execute query configuration', () => {
    it('does not execute when quoteId is null', () => {
      renderHook(() => useBridgingSteps(TOKEN_SYMBOLS, null));
      expect(capturedExecuteConfig?.enabled).toBe(false);
    });

    it('does not execute when quoteId is undefined', () => {
      renderHook(() => useBridgingSteps(TOKEN_SYMBOLS, undefined));
      expect(capturedExecuteConfig?.enabled).toBe(false);
    });

    it('does not execute when offline', () => {
      mockUseOnlineStatusContext.mockReturnValue({ isOnline: false });
      renderHook(() => useBridgingSteps(TOKEN_SYMBOLS, MOCK_QUOTE_ID));
      expect(capturedExecuteConfig?.enabled).toBe(false);
    });

    it('executes when quoteId is provided and online', () => {
      renderHook(() => useBridgingSteps(TOKEN_SYMBOLS, MOCK_QUOTE_ID));
      expect(capturedExecuteConfig?.enabled).toBe(true);
    });

    it('sets retry to false', () => {
      renderHook(() => useBridgingSteps(TOKEN_SYMBOLS, MOCK_QUOTE_ID));
      expect(capturedExecuteConfig?.retry).toBe(false);
    });

    it('sets refetchOnWindowFocus to false', () => {
      renderHook(() => useBridgingSteps(TOKEN_SYMBOLS, MOCK_QUOTE_ID));
      expect(capturedExecuteConfig?.refetchOnWindowFocus).toBe(false);
    });

    it('sets refetchInterval to false', () => {
      renderHook(() => useBridgingSteps(TOKEN_SYMBOLS, MOCK_QUOTE_ID));
      expect(capturedExecuteConfig?.refetchInterval).toBe(false);
    });

    it('includes quoteId in the queryKey', () => {
      renderHook(() => useBridgingSteps(TOKEN_SYMBOLS, MOCK_QUOTE_ID));
      expect(capturedExecuteConfig?.queryKey).toEqual([
        'bridgeExecute',
        MOCK_QUOTE_ID,
      ]);
    });
  });

  // -------------------------------------------------------------------------
  // Execute queryFn
  // -------------------------------------------------------------------------

  describe('execute queryFn', () => {
    it('calls delayInSeconds(1) before executing', async () => {
      const response = makeBridgeResponse([
        makeRequestStatus('EXECUTION_DONE'),
      ]);
      mockExecuteBridge.mockResolvedValue(response);

      renderHook(() => useBridgingSteps(TOKEN_SYMBOLS, MOCK_QUOTE_ID));
      await capturedExecuteConfig!.queryFn({
        signal: new AbortController().signal,
      });

      expect(mockDelayInSeconds).toHaveBeenCalledWith(1);
      expect(mockExecuteBridge).toHaveBeenCalled();
    });

    it('calls BridgeService.executeBridge with quoteId and signal', async () => {
      const response = makeBridgeResponse([
        makeRequestStatus('EXECUTION_DONE'),
      ]);
      mockExecuteBridge.mockResolvedValue(response);
      const signal = new AbortController().signal;

      renderHook(() => useBridgingSteps(TOKEN_SYMBOLS, MOCK_QUOTE_ID));
      const result = await capturedExecuteConfig!.queryFn({ signal });

      expect(mockExecuteBridge).toHaveBeenCalledWith(MOCK_QUOTE_ID, signal);
      expect(result).toEqual(response);
    });

    it('logs warning and returns undefined when quoteId is falsy', async () => {
      const warnSpy = jest.spyOn(window.console, 'warn').mockImplementation();

      // Render with a truthy quoteId to capture the config, then test
      // the queryFn behavior when quoteId is absent.
      // We need to render with a truthy quoteId to get the config captured,
      // but the queryFn itself checks quoteId via closure.
      // Instead, render with empty string to get config then call queryFn.
      renderHook(() => useBridgingSteps(TOKEN_SYMBOLS, ''));
      // The queryFn closes over quoteId which is '' (falsy)
      // Must pass context object since queryFn destructures { signal }
      const result = await capturedExecuteConfig!.queryFn({
        signal: new AbortController().signal,
      });

      expect(warnSpy).toHaveBeenCalledWith(
        'No quoteId provided to execute bridge',
      );
      expect(result).toBeUndefined();
      expect(mockExecuteBridge).not.toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it('throws and logs error when executeBridge fails', async () => {
      const error = new Error('Bridge execution failed');
      mockExecuteBridge.mockRejectedValue(error);
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      renderHook(() => useBridgingSteps(TOKEN_SYMBOLS, MOCK_QUOTE_ID));

      await expect(
        capturedExecuteConfig!.queryFn({
          signal: new AbortController().signal,
        }),
      ).rejects.toThrow('Bridge execution failed');

      expect(errorSpy).toHaveBeenCalledWith('Error executing bridge', error);
      errorSpy.mockRestore();
    });
  });

  // -------------------------------------------------------------------------
  // isBridging
  // -------------------------------------------------------------------------

  describe('isBridging', () => {
    it('returns true while execute query is loading', () => {
      mockExecuteQueryState = {
        ...mockExecuteQueryState,
        isLoading: true,
      };

      const { result } = renderHook(() =>
        useBridgingSteps(TOKEN_SYMBOLS, MOCK_QUOTE_ID),
      );
      expect(result.current.isBridging).toBe(true);
    });

    it('returns true while status query is loading', () => {
      mockStatusQueryState = {
        ...mockStatusQueryState,
        isLoading: true,
      };

      const { result } = renderHook(() =>
        useBridgingSteps(TOKEN_SYMBOLS, MOCK_QUOTE_ID),
      );
      expect(result.current.isBridging).toBe(true);
    });

    it('returns false when neither query is loading', () => {
      const { result } = renderHook(() =>
        useBridgingSteps(TOKEN_SYMBOLS, MOCK_QUOTE_ID),
      );
      expect(result.current.isBridging).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Completion detection
  // -------------------------------------------------------------------------

  describe('completion detection', () => {
    it('isBridgingCompleted is true when all execute response statuses are EXECUTION_DONE', () => {
      mockExecuteQueryState = {
        ...mockExecuteQueryState,
        data: makeBridgeResponse([
          makeRequestStatus('EXECUTION_DONE'),
          makeRequestStatus('EXECUTION_DONE'),
        ]),
      };

      const { result } = renderHook(() =>
        useBridgingSteps(TOKEN_SYMBOLS, MOCK_QUOTE_ID),
      );
      expect(result.current.isBridgingCompleted).toBe(true);
    });

    it('isBridgingCompleted is false when some statuses are EXECUTION_PENDING', () => {
      mockExecuteQueryState = {
        ...mockExecuteQueryState,
        data: makeBridgeResponse([
          makeRequestStatus('EXECUTION_DONE'),
          makeRequestStatus('EXECUTION_PENDING'),
        ]),
      };

      const { result } = renderHook(() =>
        useBridgingSteps(TOKEN_SYMBOLS, MOCK_QUOTE_ID),
      );
      expect(result.current.isBridgingCompleted).toBe(false);
    });

    it('short-circuits from execute data without needing status poll', () => {
      mockExecuteQueryState = {
        ...mockExecuteQueryState,
        data: makeBridgeResponse([
          makeRequestStatus('EXECUTION_DONE'),
          makeRequestStatus('EXECUTION_DONE'),
        ]),
      };
      // Status data is undefined (never polled)
      mockStatusQueryState = {
        ...mockStatusQueryState,
        data: undefined,
      };

      const { result } = renderHook(() =>
        useBridgingSteps(TOKEN_SYMBOLS, MOCK_QUOTE_ID),
      );
      expect(result.current.isBridgingCompleted).toBe(true);
    });

    it('isBridgingCompleted is true from status poll when execute is not done', () => {
      mockExecuteQueryState = {
        ...mockExecuteQueryState,
        data: makeBridgeResponse([
          makeRequestStatus('EXECUTION_PENDING'),
          makeRequestStatus('EXECUTION_PENDING'),
        ]),
      };
      mockStatusQueryState = {
        ...mockStatusQueryState,
        data: makeBridgeResponse([
          makeRequestStatus('EXECUTION_DONE'),
          makeRequestStatus('EXECUTION_DONE'),
        ]),
      };

      const { result } = renderHook(() =>
        useBridgingSteps(TOKEN_SYMBOLS, MOCK_QUOTE_ID),
      );
      expect(result.current.isBridgingCompleted).toBe(true);
    });

    it('isBridgingCompleted is false when no data exists', () => {
      const { result } = renderHook(() =>
        useBridgingSteps(TOKEN_SYMBOLS, MOCK_QUOTE_ID),
      );
      expect(result.current.isBridgingCompleted).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Failure detection
  // -------------------------------------------------------------------------

  describe('failure detection', () => {
    it('isBridgingFailed is true when execute query errors', () => {
      mockExecuteQueryState = {
        ...mockExecuteQueryState,
        isError: true,
      };

      const { result } = renderHook(() =>
        useBridgingSteps(TOKEN_SYMBOLS, MOCK_QUOTE_ID),
      );
      expect(result.current.isBridgingFailed).toBe(true);
    });

    it('isBridgingFailed is true when any bridge_request_status is EXECUTION_FAILED from execute', () => {
      mockExecuteQueryState = {
        ...mockExecuteQueryState,
        data: makeBridgeResponse([
          makeRequestStatus('EXECUTION_DONE'),
          makeRequestStatus('EXECUTION_FAILED'),
        ]),
      };

      const { result } = renderHook(() =>
        useBridgingSteps(TOKEN_SYMBOLS, MOCK_QUOTE_ID),
      );
      expect(result.current.isBridgingFailed).toBe(true);
    });

    it('isBridgingFailed is true when status query errors', () => {
      mockStatusQueryState = {
        ...mockStatusQueryState,
        isError: true,
      };

      const { result } = renderHook(() =>
        useBridgingSteps(TOKEN_SYMBOLS, MOCK_QUOTE_ID),
      );
      expect(result.current.isBridgingFailed).toBe(true);
    });

    it('isBridgingFailed is true when status poll data has EXECUTION_FAILED', () => {
      mockExecuteQueryState = {
        ...mockExecuteQueryState,
        data: makeBridgeResponse([makeRequestStatus('EXECUTION_PENDING')]),
      };
      mockStatusQueryState = {
        ...mockStatusQueryState,
        data: makeBridgeResponse([makeRequestStatus('EXECUTION_FAILED')]),
      };

      const { result } = renderHook(() =>
        useBridgingSteps(TOKEN_SYMBOLS, MOCK_QUOTE_ID),
      );
      expect(result.current.isBridgingFailed).toBe(true);
    });

    it('isBridgingFailed is true with mixed statuses including EXECUTION_FAILED', () => {
      mockExecuteQueryState = {
        ...mockExecuteQueryState,
        data: makeBridgeResponse([
          makeRequestStatus('EXECUTION_DONE'),
          makeRequestStatus('EXECUTION_FAILED'),
          makeRequestStatus('EXECUTION_PENDING'),
        ]),
      };

      const { result } = renderHook(() =>
        useBridgingSteps(
          ['ETH', 'USDC', 'OLAS'] as TokenSymbol[],
          MOCK_QUOTE_ID,
        ),
      );
      expect(result.current.isBridgingFailed).toBe(true);
    });

    it('isBridgingFailed is false when no errors and no failures', () => {
      mockExecuteQueryState = {
        ...mockExecuteQueryState,
        data: makeBridgeResponse([makeRequestStatus('EXECUTION_PENDING')]),
      };

      const { result } = renderHook(() =>
        useBridgingSteps(TOKEN_SYMBOLS, MOCK_QUOTE_ID),
      );
      expect(result.current.isBridgingFailed).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Status polling configuration
  // -------------------------------------------------------------------------

  describe('status polling configuration', () => {
    it('status poll is enabled when execute has data and is not loading/fetching', () => {
      mockExecuteQueryState = {
        isLoading: false,
        isFetching: false,
        isError: false,
        data: makeBridgeResponse([makeRequestStatus('EXECUTION_PENDING')]),
      };

      renderHook(() => useBridgingSteps(TOKEN_SYMBOLS, MOCK_QUOTE_ID));
      expect(capturedStatusConfig?.enabled).toBe(true);
    });

    it('status poll is disabled when execute is still loading', () => {
      mockExecuteQueryState = {
        isLoading: true,
        isFetching: true,
        isError: false,
        data: undefined,
      };

      renderHook(() => useBridgingSteps(TOKEN_SYMBOLS, MOCK_QUOTE_ID));
      expect(capturedStatusConfig?.enabled).toBe(false);
    });

    it('status poll is disabled when execute is fetching', () => {
      mockExecuteQueryState = {
        isLoading: false,
        isFetching: true,
        isError: false,
        data: undefined,
      };

      renderHook(() => useBridgingSteps(TOKEN_SYMBOLS, MOCK_QUOTE_ID));
      expect(capturedStatusConfig?.enabled).toBe(false);
    });

    it('status poll is disabled when execute has no data', () => {
      mockExecuteQueryState = {
        isLoading: false,
        isFetching: false,
        isError: false,
        data: undefined,
      };

      renderHook(() => useBridgingSteps(TOKEN_SYMBOLS, MOCK_QUOTE_ID));
      expect(capturedStatusConfig?.enabled).toBe(false);
    });

    it('status poll is disabled when offline', () => {
      mockUseOnlineStatusContext.mockReturnValue({ isOnline: false });
      mockExecuteQueryState = {
        isLoading: false,
        isFetching: false,
        isError: false,
        data: makeBridgeResponse([makeRequestStatus('EXECUTION_PENDING')]),
      };

      renderHook(() => useBridgingSteps(TOKEN_SYMBOLS, MOCK_QUOTE_ID));
      expect(capturedStatusConfig?.enabled).toBe(false);
    });

    it('status poll is disabled when quoteId is absent', () => {
      mockExecuteQueryState = {
        isLoading: false,
        isFetching: false,
        isError: false,
        data: makeBridgeResponse([makeRequestStatus('EXECUTION_PENDING')]),
      };

      renderHook(() => useBridgingSteps(TOKEN_SYMBOLS, null));
      expect(capturedStatusConfig?.enabled).toBe(false);
    });

    it('polls at FIVE_SECONDS_INTERVAL when bridging is in progress', () => {
      mockExecuteQueryState = {
        isLoading: false,
        isFetching: false,
        isError: false,
        data: makeBridgeResponse([makeRequestStatus('EXECUTION_PENDING')]),
      };

      renderHook(() => useBridgingSteps(TOKEN_SYMBOLS, MOCK_QUOTE_ID));
      expect(capturedStatusConfig?.refetchInterval).toBe(FIVE_SECONDS_INTERVAL);
    });

    it('stops polling when execute is completed', () => {
      mockExecuteQueryState = {
        isLoading: false,
        isFetching: false,
        isError: false,
        data: makeBridgeResponse([makeRequestStatus('EXECUTION_DONE')]),
      };

      renderHook(() => useBridgingSteps(TOKEN_SYMBOLS, MOCK_QUOTE_ID));
      expect(capturedStatusConfig?.refetchInterval).toBe(false);
    });

    it('stops polling when execute has failed', () => {
      mockExecuteQueryState = {
        isLoading: false,
        isFetching: false,
        isError: false,
        data: makeBridgeResponse([makeRequestStatus('EXECUTION_FAILED')]),
      };

      renderHook(() => useBridgingSteps(TOKEN_SYMBOLS, MOCK_QUOTE_ID));
      expect(capturedStatusConfig?.refetchInterval).toBe(false);
    });

    it('includes quoteId in the status queryKey', () => {
      renderHook(() => useBridgingSteps(TOKEN_SYMBOLS, MOCK_QUOTE_ID));
      expect(capturedStatusConfig?.queryKey).toEqual([
        'bridgeStatusByQuoteId',
        MOCK_QUOTE_ID,
      ]);
    });
  });

  // -------------------------------------------------------------------------
  // Status queryFn
  // -------------------------------------------------------------------------

  describe('status queryFn', () => {
    it('calls BridgeService.getBridgeStatus with quoteId', async () => {
      const response = makeBridgeResponse([
        makeRequestStatus('EXECUTION_DONE'),
      ]);
      mockGetBridgeStatus.mockResolvedValue(response);

      renderHook(() => useBridgingSteps(TOKEN_SYMBOLS, MOCK_QUOTE_ID));
      const result = await capturedStatusConfig!.queryFn();

      expect(mockGetBridgeStatus).toHaveBeenCalledWith(MOCK_QUOTE_ID);
      expect(result).toEqual(response);
    });

    it('logs warning and returns undefined when quoteId is falsy', async () => {
      const warnSpy = jest.spyOn(window.console, 'warn').mockImplementation();

      renderHook(() => useBridgingSteps(TOKEN_SYMBOLS, ''));
      const result = await capturedStatusConfig!.queryFn();

      expect(warnSpy).toHaveBeenCalledWith(
        'No quoteId provided to fetch bridge status',
      );
      expect(result).toBeUndefined();
      expect(mockGetBridgeStatus).not.toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it('throws and logs error when getBridgeStatus fails', async () => {
      const error = new Error('Status fetch failed');
      mockGetBridgeStatus.mockRejectedValue(error);
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      renderHook(() => useBridgingSteps(TOKEN_SYMBOLS, MOCK_QUOTE_ID));

      await expect(capturedStatusConfig!.queryFn()).rejects.toThrow(
        'Status fetch failed',
      );
      expect(errorSpy).toHaveBeenCalledWith(
        'Error fetching bridge status',
        error,
      );
      errorSpy.mockRestore();
    });
  });

  // -------------------------------------------------------------------------
  // Bridge status output (getBridgeStats mapping)
  // -------------------------------------------------------------------------

  describe('bridgeStatus output', () => {
    it('maps EXECUTION_DONE to finish status', () => {
      const explorerLink = 'https://explorer.example.com/tx/0xabc';
      mockExecuteQueryState = {
        isLoading: false,
        isFetching: false,
        isError: false,
        data: makeBridgeResponse([
          makeRequestStatus('EXECUTION_DONE', explorerLink),
        ]),
      };

      const { result } = renderHook(() =>
        useBridgingSteps(['ETH'] as TokenSymbol[], MOCK_QUOTE_ID),
      );
      expect(result.current.bridgeStatus).toEqual([
        {
          symbol: 'ETH',
          status: 'finish',
          txnLink: explorerLink,
        },
      ]);
    });

    it('maps EXECUTION_FAILED to error status (via status poll)', () => {
      const explorerLink = 'https://explorer.example.com/tx/0xfail';
      // Execute has pending data (not completed), so bridgeStatus uses statusBridgeSteps
      mockExecuteQueryState = {
        isLoading: false,
        isFetching: false,
        isError: false,
        data: makeBridgeResponse([makeRequestStatus('EXECUTION_PENDING')]),
      };
      mockStatusQueryState = {
        isLoading: false,
        isError: false,
        data: makeBridgeResponse([
          makeRequestStatus('EXECUTION_FAILED', explorerLink),
        ]),
      };

      const { result } = renderHook(() =>
        useBridgingSteps(['ETH'] as TokenSymbol[], MOCK_QUOTE_ID),
      );
      expect(result.current.bridgeStatus).toEqual([
        {
          symbol: 'ETH',
          status: 'error',
          txnLink: explorerLink,
        },
      ]);
    });

    it('maps EXECUTION_PENDING to process status (via status poll)', () => {
      const explorerLink = 'https://explorer.example.com/tx/0xpending';
      mockExecuteQueryState = {
        isLoading: false,
        isFetching: false,
        isError: false,
        data: makeBridgeResponse([makeRequestStatus('EXECUTION_PENDING')]),
      };
      mockStatusQueryState = {
        isLoading: false,
        isError: false,
        data: makeBridgeResponse([
          makeRequestStatus('EXECUTION_PENDING', explorerLink),
        ]),
      };

      const { result } = renderHook(() =>
        useBridgingSteps(['ETH'] as TokenSymbol[], MOCK_QUOTE_ID),
      );
      expect(result.current.bridgeStatus).toEqual([
        {
          symbol: 'ETH',
          status: 'process',
          txnLink: explorerLink,
        },
      ]);
    });

    it.each([
      ['QUOTE_DONE' as QuoteStatus],
      ['CREATED' as QuoteStatus],
      ['QUOTE_FAILED' as QuoteStatus],
    ])(
      'maps %s to process status (default, via status poll)',
      (quoteStatus) => {
        mockExecuteQueryState = {
          isLoading: false,
          isFetching: false,
          isError: false,
          data: makeBridgeResponse([makeRequestStatus('EXECUTION_PENDING')]),
        };
        mockStatusQueryState = {
          isLoading: false,
          isError: false,
          data: makeBridgeResponse([makeRequestStatus(quoteStatus)]),
        };

        const { result } = renderHook(() =>
          useBridgingSteps(['ETH'] as TokenSymbol[], MOCK_QUOTE_ID),
        );
        expect(result.current.bridgeStatus?.[0].status).toBe('process');
      },
    );

    it('pairs tokenSymbols by array index', () => {
      const ethLink = 'https://explorer.example.com/tx/0xeth';
      const usdcLink = 'https://explorer.example.com/tx/0xusdc';
      mockExecuteQueryState = {
        isLoading: false,
        isFetching: false,
        isError: false,
        data: makeBridgeResponse([
          makeRequestStatus('EXECUTION_DONE', ethLink),
          makeRequestStatus('EXECUTION_DONE', usdcLink),
        ]),
      };

      const { result } = renderHook(() =>
        useBridgingSteps(TOKEN_SYMBOLS, MOCK_QUOTE_ID),
      );
      expect(result.current.bridgeStatus).toEqual([
        { symbol: 'ETH', status: 'finish', txnLink: ethLink },
        { symbol: 'USDC', status: 'finish', txnLink: usdcLink },
      ]);
    });

    it('returns executeBridgeSteps when execute is completed', () => {
      mockExecuteQueryState = {
        isLoading: false,
        isFetching: false,
        isError: false,
        data: makeBridgeResponse([
          makeRequestStatus('EXECUTION_DONE', 'https://exec-link'),
        ]),
      };
      mockStatusQueryState = {
        isLoading: false,
        isError: false,
        data: makeBridgeResponse([
          makeRequestStatus('EXECUTION_DONE', 'https://status-link'),
        ]),
      };

      const { result } = renderHook(() =>
        useBridgingSteps(['ETH'] as TokenSymbol[], MOCK_QUOTE_ID),
      );
      // Should use execute data (exec-link), not status data (status-link)
      expect(result.current.bridgeStatus?.[0].txnLink).toBe(
        'https://exec-link',
      );
    });

    it('returns statusBridgeSteps when execute is not completed', () => {
      mockExecuteQueryState = {
        isLoading: false,
        isFetching: false,
        isError: false,
        data: makeBridgeResponse([
          makeRequestStatus('EXECUTION_PENDING', 'https://exec-link'),
        ]),
      };
      mockStatusQueryState = {
        isLoading: false,
        isError: false,
        data: makeBridgeResponse([
          makeRequestStatus('EXECUTION_DONE', 'https://status-link'),
        ]),
      };

      const { result } = renderHook(() =>
        useBridgingSteps(['ETH'] as TokenSymbol[], MOCK_QUOTE_ID),
      );
      // Should use status data since execute is not complete
      expect(result.current.bridgeStatus?.[0].txnLink).toBe(
        'https://status-link',
      );
    });

    it('returns undefined bridgeStatus when execute is loading', () => {
      mockExecuteQueryState = {
        isLoading: true,
        isFetching: true,
        isError: false,
        data: undefined,
      };

      const { result } = renderHook(() =>
        useBridgingSteps(TOKEN_SYMBOLS, MOCK_QUOTE_ID),
      );
      expect(result.current.bridgeStatus).toBeUndefined();
    });

    it('returns undefined bridgeStatus when execute has error', () => {
      mockExecuteQueryState = {
        isLoading: false,
        isFetching: false,
        isError: true,
        data: undefined,
      };

      const { result } = renderHook(() =>
        useBridgingSteps(TOKEN_SYMBOLS, MOCK_QUOTE_ID),
      );
      expect(result.current.bridgeStatus).toBeUndefined();
    });
  });
});
