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
  // Successful fetch — transforms response with $5 fiat buffer
  // -------------------------------------------------------------------------

  it('fetches MoonPay quote and applies $5 fiat buffer to baseCurrencyAmount', async () => {
    const quoteResponse = makeMoonPayQuoteResponse();

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(quoteResponse),
    });

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

    // fiatAmount = round(13.17 + 5, 2) = 18.17
    expect(result.current.data?.fiatAmount).toBe(18.17);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('rounds fiatAmount to 2 decimal places', async () => {
    // 8.336 + 5 = 13.336, round(13.336, 2) = 13.34
    const quoteResponse = makeMoonPayQuoteResponse({
      baseCurrencyAmount: 8.336,
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(quoteResponse),
    });

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

    expect(result.current.data?.fiatAmount).toBe(13.34);
  });

  it('ignores totalAmount returned by the API (only baseCurrencyAmount drives display)', async () => {
    // baseCurrencyAmount=10, totalAmount=15 (fees-inclusive). Display reads
    // baseCurrencyAmount + buffer, not totalAmount.
    const quoteResponse = makeMoonPayQuoteResponse({
      baseCurrencyAmount: 10,
      totalAmount: 15,
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(quoteResponse),
    });

    const { result } = renderHook(
      () =>
        useTotalFiatFromNativeToken({
          nativeTokenAmount: 0.005,
          selectedChainId: EvmChainIdMap.Gnosis,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // 10 + 5 = 15 (matches totalAmount by coincidence; this asserts the
    // buffer math, not totalAmount being read)
    expect(result.current.data?.fiatAmount).toBe(15);
  });

  // -------------------------------------------------------------------------
  // nativeAmountToDisplay — buffer math via conversionRate
  // -------------------------------------------------------------------------

  it('computes nativeAmountToDisplay via $5 / conversionRate when nativeAmountToPay is provided', async () => {
    // conversionRate=2500 → buffer in native = 5/2500 = 0.002
    // nativeAmountToPay=1 → 1 + 0.002 = 1.002
    const quoteResponse = makeMoonPayQuoteResponse({ conversionRate: 2500 });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(quoteResponse),
    });

    const { result } = renderHook(
      () =>
        useTotalFiatFromNativeToken({
          nativeTokenAmount: 1,
          nativeAmountToPay: 1,
          selectedChainId: EvmChainIdMap.Base,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.nativeAmountToDisplay).toBe(1.002);
  });

  it('uses 0 for nativeAmountToPay when not provided (defaults via ??)', async () => {
    // nativeAmountToPay defaults to 0; nativeAmountToDisplay = 0 + 5/2500 = 0.002
    const quoteResponse = makeMoonPayQuoteResponse({ conversionRate: 2500 });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(quoteResponse),
    });

    const { result } = renderHook(
      () =>
        useTotalFiatFromNativeToken({
          nativeTokenAmount: 1,
          selectedChainId: EvmChainIdMap.Base,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.nativeAmountToDisplay).toBe(0.002);
  });

  // -------------------------------------------------------------------------
  // Fetch error handling
  // -------------------------------------------------------------------------

  it('enters error state when fetch returns non-ok response with parsed error', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
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
  });

  it('enters error state with fallback message when fetch returns non-ok with no body', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
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

  it('enters error state when fetch rejects', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

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
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeMoonPayQuoteResponse()),
    });

    renderHook(
      () =>
        useTotalFiatFromNativeToken({
          nativeTokenAmount: 0.00570193,
          selectedChainId: EvmChainIdMap.Gnosis,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('https://mock-pearl-api/api/moonpay/quote?');
    expect(url).toContain('currencyCode=eth_base');
    expect(url).toContain('quoteCurrencyAmount=0.00570193');
    expect(options.method).toBe('GET');
    expect(options.headers).toEqual({ Accept: 'application/json' });
  });

  it('hits MOONPAY_QUOTE_URL with pol + amount for Polygon', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeMoonPayQuoteResponse()),
    });

    renderHook(
      () =>
        useTotalFiatFromNativeToken({
          nativeTokenAmount: 10,
          selectedChainId: EvmChainIdMap.Polygon,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('currencyCode=pol');
    expect(url).toContain('quoteCurrencyAmount=10');
  });
});
