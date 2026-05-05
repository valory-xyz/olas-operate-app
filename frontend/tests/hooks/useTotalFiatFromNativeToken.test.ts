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
  ON_RAMP_GATEWAY_URL: 'https://mock-transak.com/',
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

/** Builds a mock Transak price-quote response matching real API shape. */
const makeTransakQuoteResponse = (
  overrides: { fiatAmount?: number; cryptoAmount?: number } = {},
) => ({
  response: {
    quoteId: 'db19d05e-cacc-43c0-80e7-0ae973662063',
    conversionPrice: 0.0004898564956664364,
    marketConversionPrice: 0.0004933885928557331,
    slippage: 0.72,
    fiatCurrency: 'USD',
    cryptoCurrency: 'ETH',
    paymentMethod: 'credit_debit_card',
    fiatAmount: overrides.fiatAmount ?? 13.17,
    cryptoAmount: overrides.cryptoAmount ?? 0.00570193,
    isBuyOrSell: 'BUY' as const,
    network: 'base',
    feeDecimal: 0.01,
    totalFee: 1.53,
    feeBreakdown: [
      { name: 'Transak fee', value: 1.53, id: 'transak_fee' },
      { name: 'Network/Exchange fee', value: 0, id: 'network_fee' },
    ],
    nonce: 1773074894,
    cryptoLiquidityProvider: 'transak',
    notes: [],
  },
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

// ---------------------------------------------------------------------------
// getEthWithBuffer — extracted via module internals
// ---------------------------------------------------------------------------
// Since getEthWithBuffer is not exported, we test it indirectly through the
// hook's `select` transform. However, the logic is deterministic enough to
// also validate through the hook output.

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
  // Successful fetch — transforms response with buffer
  // -------------------------------------------------------------------------

  it('fetches Transak quote and applies $5 fiat buffer', async () => {
    const quoteResponse = makeTransakQuoteResponse();

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
    const quoteResponse = makeTransakQuoteResponse({ fiatAmount: 8.336 });

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

  // -------------------------------------------------------------------------
  // nativeAmountToDisplay — getEthWithBuffer integration
  // -------------------------------------------------------------------------

  it('computes nativeAmountToDisplay with buffer when nativeAmountToPay is provided', async () => {
    // fiatAmount=2500, cryptoAmount=1 → ~$2500/ETH (realistic price)
    // buffer = (1/2500)*5 = 0.002
    // nativeAmountToPay=1 → 1 + 0.002 = 1.002
    const quoteResponse = makeTransakQuoteResponse({
      fiatAmount: 2500,
      cryptoAmount: 1,
    });

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
    // nativeAmountToPay defaults to 0
    // getEthWithBuffer(0, 2500, 1) = 0 + (1/2500)*5 = 0.002
    const quoteResponse = makeTransakQuoteResponse({
      fiatAmount: 2500,
      cryptoAmount: 1,
    });

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

  it('returns nativeAmountToPay unchanged when API fiatAmount is 0 (division-by-zero guard)', async () => {
    // When fiatAmount=0, getEthWithBuffer returns ethAmount unchanged
    const quoteResponse = makeTransakQuoteResponse({
      fiatAmount: 0,
      cryptoAmount: 0,
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(quoteResponse),
    });

    const { result } = renderHook(
      () =>
        useTotalFiatFromNativeToken({
          nativeTokenAmount: 1,
          nativeAmountToPay: 0.5,
          selectedChainId: EvmChainIdMap.Gnosis,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // getEthWithBuffer(0.5, 0, 0) → 0.5 (unchanged, fiatAmount is falsy)
    expect(result.current.data?.nativeAmountToDisplay).toBe(0.5);
    // fiat buffer: round(0 + 5, 2) = 5
    expect(result.current.data?.fiatAmount).toBe(5);
  });

  // -------------------------------------------------------------------------
  // Fetch error handling
  // -------------------------------------------------------------------------

  it('enters error state when fetch returns non-ok response', async () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

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

    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toBe(
      'Failed to fetch Transak quote: 500',
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error fetching Transak quote',
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });

  it('enters error state when fetch rejects', async () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

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
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error fetching Transak quote',
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });

  // -------------------------------------------------------------------------
  // Fetch URL correctness
  // -------------------------------------------------------------------------

  it('constructs the correct Transak price-quote URL for Gnosis (maps to Base)', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeTransakQuoteResponse()),
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
    expect(url).toContain('https://mock-transak.com/price-quote?');
    expect(url).toContain('cryptoAmount=0.00570193');
    // Gnosis maps to Base chain, which uses 'base' middleware name and 'ETH'
    expect(url).toContain('network=base');
    expect(url).toContain('cryptoCurrency=ETH');
    expect(url).toContain('fiatCurrency=USD');
    expect(url).toContain('isBuyOrSell=BUY');
    expect(url).toContain('paymentMethod=credit_debit_card');
    expect(options.method).toBe('GET');
    expect(options.headers).toEqual({ accept: 'application/json' });
  });

  it('constructs URL with correct crypto for Polygon (maps to POL)', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeTransakQuoteResponse()),
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
    expect(url).toContain('network=polygon');
    expect(url).toContain('cryptoCurrency=POL');
    expect(url).toContain('cryptoAmount=10');
  });
});
