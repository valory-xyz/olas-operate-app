/**
 * Tests for MoonPayService — pearl-api proxy for signed widget URLs and
 * real-time buy quotes. Mirrors the service/Support.ts pattern: static
 * object, fetch + parseApiError, no inline fetch in components.
 */

jest.mock('../../constants/urls', () => ({
  MOONPAY_QUOTE_URL: 'https://mock-pearl-api/api/moonpay/quote',
  MOONPAY_SIGN_URL: 'https://mock-pearl-api/api/moonpay/sign',
}));

/* eslint-disable @typescript-eslint/no-var-requires */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { MoonPayService } = require('../../service/MoonPay');
/* eslint-enable @typescript-eslint/no-var-requires */

describe('MoonPayService.getSignedUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('POSTs to MOONPAY_SIGN_URL with JSON body and returns the signed URL on 200', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          url: 'https://buy.moonpay.com?apiKey=pk_test_123&signature=sig',
        }),
    });

    const result = await MoonPayService.getSignedUrl({
      nativeAmount: '0.050000',
      currencyCode: 'eth_base',
      walletAddress: '0xabc',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://mock-pearl-api/api/moonpay/sign',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nativeAmount: '0.050000',
          currencyCode: 'eth_base',
          walletAddress: '0xabc',
        }),
      }),
    );
    expect(result).toEqual({
      success: true,
      url: 'https://buy.moonpay.com?apiKey=pk_test_123&signature=sig',
    });
  });

  it('returns success: false with parsed error message on non-ok response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'INVALID_AMOUNT' }),
    });

    const result = await MoonPayService.getSignedUrl({
      nativeAmount: '0.000001',
      currencyCode: 'eth_base',
      walletAddress: '0xabc',
    });

    expect(result).toEqual({ success: false, error: 'INVALID_AMOUNT' });
  });

  it('falls back to default error message when no body returned', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('not json')),
    });

    const result = await MoonPayService.getSignedUrl({
      nativeAmount: '0.05',
      currencyCode: 'eth_base',
      walletAddress: '0xabc',
    });

    expect(result).toEqual({ success: false, error: 'Failed to load MoonPay' });
  });

  it('returns success: false on network failure (fetch rejects)', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    const result = await MoonPayService.getSignedUrl({
      nativeAmount: '0.05',
      currencyCode: 'eth_base',
      walletAddress: '0xabc',
    });

    expect(result).toEqual({ success: false, error: 'Network error' });
  });

  it('returns the fallback error when 200 body is non-JSON (no SyntaxError leak)', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.reject(new SyntaxError('Unexpected token <')),
    });

    const result = await MoonPayService.getSignedUrl({
      nativeAmount: '0.05',
      currencyCode: 'eth_base',
      walletAddress: '0xabc',
    });

    expect(result).toEqual({ success: false, error: 'Failed to load MoonPay' });
  });
});

describe('MoonPayService.getBuyQuote', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('GETs MOONPAY_QUOTE_URL with currencyCode + quoteCurrencyAmount params', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          baseCurrencyAmount: 13.17,
          totalAmount: 14.5,
          conversionRate: 2310.0,
        }),
    });

    const result = await MoonPayService.getBuyQuote({
      currencyCode: 'eth_base',
      quoteCurrencyAmount: 0.005,
    });

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('https://mock-pearl-api/api/moonpay/quote?');
    expect(url).toContain('currencyCode=eth_base');
    expect(url).toContain('quoteCurrencyAmount=0.005');
    expect(options).toEqual(
      expect.objectContaining({
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: expect.any(AbortSignal),
      }),
    );
    expect(result).toEqual({
      success: true,
      quote: {
        baseCurrencyAmount: 13.17,
        totalAmount: 14.5,
        conversionRate: 2310.0,
      },
    });
  });

  it('echoes MoonPay error code (AMOUNT_TOO_LOW) on 4xx', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'AMOUNT_TOO_LOW' }),
    });

    const result = await MoonPayService.getBuyQuote({
      currencyCode: 'eth_base',
      quoteCurrencyAmount: 0.0000001,
    });

    expect(result).toEqual({ success: false, error: 'AMOUNT_TOO_LOW' });
  });

  it('echoes MoonPay error code (UNSUPPORTED_CURRENCY) on 4xx', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'UNSUPPORTED_CURRENCY' }),
    });

    const result = await MoonPayService.getBuyQuote({
      currencyCode: 'unknown_chain',
      quoteCurrencyAmount: 0.005,
    });

    expect(result).toEqual({ success: false, error: 'UNSUPPORTED_CURRENCY' });
  });

  it('falls back to default error message when 5xx with no body', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 502,
      json: () => Promise.reject(new Error('not json')),
    });

    const result = await MoonPayService.getBuyQuote({
      currencyCode: 'eth_base',
      quoteCurrencyAmount: 0.005,
    });

    expect(result).toEqual({
      success: false,
      error: 'Failed to fetch MoonPay quote',
    });
  });

  it('returns success: false on network failure (fetch rejects)', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    const result = await MoonPayService.getBuyQuote({
      currencyCode: 'eth_base',
      quoteCurrencyAmount: 0.005,
    });

    expect(result).toEqual({ success: false, error: 'Network error' });
  });

  it('returns the fallback error when 200 body is non-JSON (no SyntaxError leak)', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.reject(new SyntaxError('Unexpected token <')),
    });

    const result = await MoonPayService.getBuyQuote({
      currencyCode: 'eth_base',
      quoteCurrencyAmount: 0.005,
    });

    expect(result).toEqual({
      success: false,
      error: 'Failed to fetch MoonPay quote',
    });
  });
});
