import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, PropsWithChildren } from 'react';

import { EvmChainIdMap } from '../../constants/chains';

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

jest.mock('../../constants/urls', () => ({
  MOONPAY_QUOTE_URL: 'https://mock-pearl-api/api/moonpay/quote',
  MOONPAY_SIGN_URL: 'https://mock-pearl-api/api/moonpay/sign',
  PEARL_API_URL: 'https://mock-pearl-api',
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  // eslint-disable-next-line react/display-name
  return ({ children }: PropsWithChildren) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
};

/** Builds a mock MoonPay /v3/.../buy_quote response shape. */
const makeMoonPayQuoteResponse = (
  overrides: {
    baseCurrencyAmount?: number;
    totalAmount?: number;
    conversionRate?: number;
  } = {},
) => ({
  baseCurrencyAmount: overrides.baseCurrencyAmount ?? 13.17,
  totalAmount: overrides.totalAmount ?? 14.17,
  conversionRate: overrides.conversionRate ?? 2310.0,
});

/**
 * Sets up the fetch mock to return two MoonPay quote responses in sequence —
 * one for the un-buffered query (returns conversionRate), one for the buffered
 * query (returns totalAmount the user is actually charged).
 */
const mockTwoQuoteResponses = (
  first: ReturnType<typeof makeMoonPayQuoteResponse>,
  second: ReturnType<typeof makeMoonPayQuoteResponse>,
) => {
  (global.fetch as jest.Mock)
    .mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(first),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(second),
    });
};

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-var-requires */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {
  useTotalFiatFromNativeToken,
} = require('../../hooks/useTotalFiatFromNativeToken');
/* eslint-enable @typescript-eslint/no-var-requires */

describe('useTotalFiatFromNativeToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // ensureRequired — throws when selectedChainId is nil
  // -------------------------------------------------------------------------

  it('throws when selectedChainId is null', () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    expect(() => {
      renderHook(
        () =>
          useTotalFiatFromNativeToken({
            nativeTokenAmount: 1,
            selectedChainId: null,
          }),
        { wrapper: createWrapper() },
      );
    }).toThrow("Chain ID can't be empty");

    consoleSpy.mockRestore();
  });

  it('throws when selectedChainId is undefined', () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    expect(() => {
      renderHook(
        () =>
          useTotalFiatFromNativeToken({
            nativeTokenAmount: 1,
            selectedChainId: undefined,
          }),
        { wrapper: createWrapper() },
      );
    }).toThrow("Chain ID can't be empty");

    consoleSpy.mockRestore();
  });

  // -------------------------------------------------------------------------
  // Query disabled scenarios
  // -------------------------------------------------------------------------

  it('does not fetch when skip is true', () => {
    const { result } = renderHook(
      () =>
        useTotalFiatFromNativeToken({
          nativeTokenAmount: 1,
          selectedChainId: EvmChainIdMap.Gnosis,
          skip: true,
        }),
      { wrapper: createWrapper() },
    );

    expect(result.current.isFetching).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('does not fetch when nativeTokenAmount is undefined', () => {
    const { result } = renderHook(
      () =>
        useTotalFiatFromNativeToken({
          nativeTokenAmount: undefined,
          selectedChainId: EvmChainIdMap.Gnosis,
        }),
      { wrapper: createWrapper() },
    );

    expect(result.current.isFetching).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Successful fetch — two quotes; fiatAmount = second.totalAmount
  // -------------------------------------------------------------------------

  it('issues two quote calls and returns totalAmount from the buffered (second) quote', async () => {
    // First quote (un-buffered): just for conversionRate.
    // Second quote (buffered): provides the fee-included totalAmount the user
    // is actually charged. Display reads from this second response directly.
    mockTwoQuoteResponses(
      makeMoonPayQuoteResponse({
        baseCurrencyAmount: 13.17,
        totalAmount: 14.17,
        conversionRate: 2310,
      }),
      makeMoonPayQuoteResponse({
        baseCurrencyAmount: 18.45,
        totalAmount: 19.85,
        conversionRate: 2310,
      }),
    );

    const { result } = renderHook(
      () =>
        useTotalFiatFromNativeToken({
          nativeTokenAmount: 0.00570193,
          selectedChainId: EvmChainIdMap.Gnosis,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
    // fiatAmount comes from the buffered (second) quote's totalAmount.
    expect(result.current.data?.fiatAmount).toBe(19.85);
  });

  it('rounds fiatAmount (totalAmount) to 2 decimal places', async () => {
    mockTwoQuoteResponses(
      makeMoonPayQuoteResponse(),
      makeMoonPayQuoteResponse({ totalAmount: 13.336 }),
    );

    const { result } = renderHook(
      () =>
        useTotalFiatFromNativeToken({
          nativeTokenAmount: 0.003,
          selectedChainId: EvmChainIdMap.Gnosis,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // round(13.336, 2) = 13.34
    expect(result.current.data?.fiatAmount).toBe(13.34);
  });

  // -------------------------------------------------------------------------
  // nativeAmountToDisplay — buffered native via $5 / conversionRate
  // -------------------------------------------------------------------------

  it('computes nativeAmountToDisplay = nativeAmount + ($5 / conversionRate from first quote)', async () => {
    // conversionRate (from first quote) = 2500 → buffer = 5/2500 = 0.002
    // nativeAmount = 1 → display = 1 + 0.002 = 1.002
    mockTwoQuoteResponses(
      makeMoonPayQuoteResponse({ conversionRate: 2500 }),
      makeMoonPayQuoteResponse({ conversionRate: 2500 }),
    );

    const { result } = renderHook(
      () =>
        useTotalFiatFromNativeToken({
          nativeTokenAmount: 1,
          nativeAmount: 1,
          selectedChainId: EvmChainIdMap.Base,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.nativeAmountToDisplay).toBe(1.002);
  });

  it('falls back to nativeTokenAmount when nativeAmount is omitted', async () => {
    // No nativeAmount → fall back to nativeTokenAmount as the buffer base.
    // conversionRate=2500 → 0.5 + 5/2500 = 0.502
    mockTwoQuoteResponses(
      makeMoonPayQuoteResponse({ conversionRate: 2500 }),
      makeMoonPayQuoteResponse({ conversionRate: 2500 }),
    );

    const { result } = renderHook(
      () =>
        useTotalFiatFromNativeToken({
          nativeTokenAmount: 0.5,
          selectedChainId: EvmChainIdMap.Base,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.nativeAmountToDisplay).toBe(0.502);
  });

  it('passes the buffered native amount as quoteCurrencyAmount on the second quote call', async () => {
    // First quote returns conversionRate=2500 → buffer = 0.002
    // Second quote should be called with nativeTokenAmount + 0.002 = 1.002
    mockTwoQuoteResponses(
      makeMoonPayQuoteResponse({ conversionRate: 2500 }),
      makeMoonPayQuoteResponse({ conversionRate: 2500 }),
    );

    renderHook(
      () =>
        useTotalFiatFromNativeToken({
          nativeTokenAmount: 1,
          selectedChainId: EvmChainIdMap.Base,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    const [firstUrl] = (global.fetch as jest.Mock).mock.calls[0];
    const [secondUrl] = (global.fetch as jest.Mock).mock.calls[1];
    expect(firstUrl).toContain('quoteCurrencyAmount=1');
    expect(secondUrl).toContain('quoteCurrencyAmount=1.002');
  });

  // -------------------------------------------------------------------------
  // Fetch error handling
  // -------------------------------------------------------------------------

  it('errors out when the first (un-buffered) quote fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'AMOUNT_TOO_LOW' }),
    });

    const { result } = renderHook(
      () =>
        useTotalFiatFromNativeToken({
          nativeTokenAmount: 0.0001,
          selectedChainId: EvmChainIdMap.Gnosis,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toBe('AMOUNT_TOO_LOW');
    // Second call never fires because the first threw.
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('errors out when the second (buffered) quote fails', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(makeMoonPayQuoteResponse()),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'AMOUNT_TOO_HIGH' }),
      });

    const { result } = renderHook(
      () =>
        useTotalFiatFromNativeToken({
          nativeTokenAmount: 1,
          selectedChainId: EvmChainIdMap.Gnosis,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect((result.current.error as Error).message).toBe('AMOUNT_TOO_HIGH');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('falls back to default error message when fetch returns non-ok with no body', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    });

    const { result } = renderHook(
      () =>
        useTotalFiatFromNativeToken({
          nativeTokenAmount: 1,
          selectedChainId: EvmChainIdMap.Gnosis,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect((result.current.error as Error).message).toBe(
      'Failed to fetch MoonPay quote',
    );
  });

  it('errors out when fetch rejects on the first quote', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error('Network error'),
    );

    const { result } = renderHook(
      () =>
        useTotalFiatFromNativeToken({
          nativeTokenAmount: 1,
          selectedChainId: EvmChainIdMap.Gnosis,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect((result.current.error as Error).message).toBe('Network error');
  });

  // -------------------------------------------------------------------------
  // Fetch URL correctness
  // -------------------------------------------------------------------------

  it('hits MOONPAY_QUOTE_URL with eth_base + amount for Gnosis (routes via Base)', async () => {
    mockTwoQuoteResponses(
      makeMoonPayQuoteResponse(),
      makeMoonPayQuoteResponse(),
    );

    renderHook(
      () =>
        useTotalFiatFromNativeToken({
          nativeTokenAmount: 0.00570193,
          selectedChainId: EvmChainIdMap.Gnosis,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    const [firstUrl, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(firstUrl).toContain('https://mock-pearl-api/api/moonpay/quote?');
    expect(firstUrl).toContain('currencyCode=eth_base');
    expect(firstUrl).toContain('quoteCurrencyAmount=0.00570193');
    expect(options.method).toBe('GET');
    expect(options.headers).toEqual({ Accept: 'application/json' });
  });

  it('hits MOONPAY_QUOTE_URL with pol_polygon + amount for Polygon', async () => {
    mockTwoQuoteResponses(
      makeMoonPayQuoteResponse(),
      makeMoonPayQuoteResponse(),
    );

    renderHook(
      () =>
        useTotalFiatFromNativeToken({
          nativeTokenAmount: 10,
          selectedChainId: EvmChainIdMap.Polygon,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    const [firstUrl] = (global.fetch as jest.Mock).mock.calls[0];
    expect(firstUrl).toContain('currencyCode=pol_polygon');
    expect(firstUrl).toContain('quoteCurrencyAmount=10');
  });
});
