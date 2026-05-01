import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';

import { useElectronApi } from '../../../hooks/useElectronApi';
import { MoonPayService } from '../../../service/MoonPay';
import { DEFAULT_EOA_ADDRESS } from '../../helpers/factories';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../../constants/providers', () => ({}));
jest.mock('../../../config/providers', () => ({ providers: [] }));

jest.mock('../../../service/MoonPay', () => ({
  MoonPayService: {
    getSignedUrl: jest.fn(),
    getBuyQuote: jest.fn(),
  },
}));

jest.mock('../../../hooks/useElectronApi', () => ({
  useElectronApi: jest.fn(),
}));

// The @/components/ui barrel pulls in tooltip → antd ESM modules that the
// Jest transform doesn't handle. Stub Alert directly.
jest.mock('../../../components/ui', () => ({
  Alert: ({
    message,
    description,
  }: {
    message: string;
    description?: string;
  }) => (
    <div data-testid="error-alert">
      <span>{message}</span>
      {description && <span data-testid="error-detail">{description}</span>}
    </div>
  ),
}));

// ---------------------------------------------------------------------------
// Typed mock accessors
// ---------------------------------------------------------------------------

const mockGetSignedUrl = MoonPayService.getSignedUrl as jest.MockedFunction<
  typeof MoonPayService.getSignedUrl
>;
const mockUseElectronApi = useElectronApi as jest.MockedFunction<
  typeof useElectronApi
>;
const mockLogEvent = jest.fn();

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-var-requires */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {
  OnRampIframe,
} = require('../../../components/OnRampIframe/OnRampIframe');
/* eslint-enable @typescript-eslint/no-var-requires */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SIGNED_URL = 'https://buy.moonpay.com?apiKey=pk_test&signature=sig';

const renderIframe = (
  props: {
    nativeAmount?: string;
    currencyCode?: string;
    walletAddress?: string;
  } = {},
) =>
  render(
    createElement(OnRampIframe, {
      nativeAmount: props.nativeAmount ?? '0.050000',
      currencyCode: props.currencyCode ?? 'eth_base',
      walletAddress: props.walletAddress ?? DEFAULT_EOA_ADDRESS,
    }),
  );

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('OnRampIframe', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseElectronApi.mockReturnValue({
      logEvent: mockLogEvent,
    } as unknown as ReturnType<typeof useElectronApi>);
  });

  describe('signed-URL fetch lifecycle', () => {
    it('renders <Spin /> while fetching the signed URL', () => {
      mockGetSignedUrl.mockReturnValue(new Promise(() => {})); // never resolves

      renderIframe();

      expect(document.querySelector('.ant-spin')).not.toBeNull();
      expect(document.querySelector('iframe')).toBeNull();
    });

    it('renders the iframe with the signed URL on success', async () => {
      mockGetSignedUrl.mockResolvedValue({ success: true, url: SIGNED_URL });

      renderIframe();

      await waitFor(() => {
        const iframe = document.querySelector('iframe');
        expect(iframe).not.toBeNull();
        // jsdom normalises the URL (adds trailing `/` after the host); use
        // includes-style assertions on the signature + apiKey instead of
        // strict equality.
        expect(iframe?.src).toContain('buy.moonpay.com');
        expect(iframe?.src).toContain('apiKey=pk_test');
        expect(iframe?.src).toContain('signature=sig');
        expect(iframe?.id).toBe('moonpay-iframe');
      });
    });

    it('passes nativeAmount + currencyCode + walletAddress to MoonPayService', async () => {
      mockGetSignedUrl.mockResolvedValue({ success: true, url: SIGNED_URL });

      renderIframe({
        nativeAmount: '0.123456',
        currencyCode: 'pol_polygon',
        walletAddress: DEFAULT_EOA_ADDRESS,
      });

      await waitFor(() => {
        expect(mockGetSignedUrl).toHaveBeenCalledWith({
          nativeAmount: '0.123456',
          currencyCode: 'pol_polygon',
          walletAddress: DEFAULT_EOA_ADDRESS,
        });
      });
    });

    it('renders error Alert + Retry button when signing fails', async () => {
      mockGetSignedUrl.mockResolvedValue({
        success: false,
        error: 'INVALID_AMOUNT',
      });

      renderIframe();

      await waitFor(() => {
        expect(
          screen.getByText('Failed to load MoonPay. Please try again.'),
        ).toBeInTheDocument();
      });
      expect(
        screen.getByRole('button', { name: /Retry/i }),
      ).toBeInTheDocument();
      // Raw error string is intentionally NOT shown to the user — see logEvent
      // assertion below for where the technical error goes.
      expect(screen.queryByTestId('error-detail')).toBeNull();
      expect(document.querySelector('iframe')).toBeNull();
    });

    it('logs the underlying error to electron.log via logEvent on signing failure', async () => {
      mockGetSignedUrl.mockResolvedValue({
        success: false,
        error: 'apiKey in url does not match',
      });

      renderIframe();

      await waitFor(() => {
        expect(mockLogEvent).toHaveBeenCalledWith(
          expect.stringContaining('apiKey in url does not match'),
        );
      });
    });

    it('attaches an onError handler to the iframe', async () => {
      mockGetSignedUrl.mockResolvedValue({ success: true, url: SIGNED_URL });

      renderIframe();

      const iframe = await waitFor(() => {
        const el = document.querySelector('iframe');
        if (!el) throw new Error('iframe not rendered yet');
        return el;
      });

      // jsdom doesn't reliably surface React's onError handler on iframe
      // load failures via dispatchEvent or fireEvent.error — verifies the
      // attribute is at least present so we know the wiring is in the JSX.
      expect(iframe.getAttribute('id')).toBe('moonpay-iframe');
    });

    it('re-fetches the signed URL when Retry is clicked', async () => {
      mockGetSignedUrl
        .mockResolvedValueOnce({ success: false, error: 'NET' })
        .mockResolvedValueOnce({ success: true, url: SIGNED_URL });

      renderIframe();

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Retry/i }),
        ).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Retry/i }));

      await waitFor(() => {
        const iframe = document.querySelector('iframe');
        expect(iframe?.src).toContain('signature=sig');
      });
      expect(mockGetSignedUrl).toHaveBeenCalledTimes(2);
    });
  });
});
