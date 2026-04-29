import { MOONPAY_QUOTE_URL, MOONPAY_SIGN_URL } from '@/constants';
import { parseApiError } from '@/utils';

type GetSignedUrlParams = {
  /** Native crypto amount, formatted as `toFixed(6)` to avoid float artifacts. */
  nativeAmount: string;
  /** MoonPay currency code (e.g. `eth_base`, `pol`). */
  currencyCode: string;
  /** Master EOA address — receives the on-ramped funds. */
  walletAddress: string;
};

type GetSignedUrlResponse =
  | { success: true; url: string }
  | { success: false; error: string };

const SIGN_URL_ERROR = 'Failed to load MoonPay';

/**
 * Fetches a server-signed MoonPay buy URL from pearl-api. The URL is signed
 * with HMAC-SHA256 using the MoonPay secret key on the server side; the secret
 * never reaches the browser.
 */
const getSignedUrl = async (
  params: GetSignedUrlParams,
): Promise<GetSignedUrlResponse> => {
  try {
    const response = await fetch(MOONPAY_SIGN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      await parseApiError(response, SIGN_URL_ERROR);
    }

    const data: { url: string } = await response.json();
    return { success: true, url: data.url };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : SIGN_URL_ERROR,
    };
  }
};

type GetBuyQuoteParams = {
  /** MoonPay currency code (e.g. `eth_base`, `pol`). */
  currencyCode: string;
  /** Native crypto amount the user wants to buy. */
  quoteCurrencyAmount: number;
};

export type MoonPayBuyQuote = {
  /** Fiat (USD) amount, fees-excluded — used for the `~$X.XX` preview. */
  baseCurrencyAmount: number;
  /** Fiat (USD) amount including MoonPay fees. Currently unused. */
  totalAmount: number;
  /** 1 native token = X USD. Used for the `$5` fiat-buffer math. */
  conversionRate: number;
};

type GetBuyQuoteResponse =
  | { success: true; quote: MoonPayBuyQuote }
  | { success: false; error: string };

const QUOTE_ERROR = 'Failed to fetch MoonPay quote';

/**
 * Fetches a real-time MoonPay buy quote via the pearl-api proxy.
 * pearl-api echoes MoonPay error codes (`AMOUNT_TOO_LOW`,
 * `UNSUPPORTED_CURRENCY`) so the frontend can surface them.
 */
const getBuyQuote = async (
  params: GetBuyQuoteParams,
): Promise<GetBuyQuoteResponse> => {
  try {
    const url = new URL(MOONPAY_QUOTE_URL);
    url.searchParams.set('currencyCode', params.currencyCode);
    url.searchParams.set(
      'quoteCurrencyAmount',
      params.quoteCurrencyAmount.toString(),
    );

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      await parseApiError(response, QUOTE_ERROR);
    }

    const data: MoonPayBuyQuote = await response.json();
    return { success: true, quote: data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : QUOTE_ERROR,
    };
  }
};

export const MoonPayService = {
  getSignedUrl,
  getBuyQuote,
};
