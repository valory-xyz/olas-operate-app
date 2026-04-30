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

jest.mock('../../../hooks/useElectronApi', () => ({
  useElectronApi: jest.fn(),
}));
jest.mock('../../../utils/delay', () => ({
  delayInSeconds: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../../service/MoonPay', () => ({
  MoonPayService: {
    getSignedUrl: jest.fn(),
    getBuyQuote: jest.fn(),
  },
}));

// The @/components/ui barrel pulls in tooltip → antd ESM modules that the
// Jest transform doesn't handle. Stub Alert directly so the iframe under
// test can resolve without triggering the antd ESM path.
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

const mockUseElectronApi = useElectronApi as jest.MockedFunction<
  typeof useElectronApi
>;
const mockGetSignedUrl = MoonPayService.getSignedUrl as jest.MockedFunction<
  typeof MoonPayService.getSignedUrl
>;

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
const MOONPAY_ORIGIN = 'https://buy.moonpay.com';

const setupMocks = (
  overrides: {
    closeFn?: jest.Mock;
    transactionFailureFn?: jest.Mock;
    logEventFn?: jest.Mock;
  } = {},
) => {
  const closeFn = overrides.closeFn ?? jest.fn();
  const transactionFailureFn = overrides.transactionFailureFn ?? jest.fn();
  const logEventFn = overrides.logEventFn ?? jest.fn();

  mockUseElectronApi.mockReturnValue({
    onRampWindow: {
      close: closeFn,
      transactionFailure: transactionFailureFn,
    },
    logEvent: logEventFn,
  } as unknown as ReturnType<typeof useElectronApi>);

  return { closeFn, transactionFailureFn, logEventFn };
};

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

// Dispatch a postMessage that mimics MoonPay's wire format. The handler
// requires a matching origin AND source identity.
const dispatchMoonPayEvent = (
  iframe: HTMLIFrameElement | null,
  event_id: string,
  origin = MOONPAY_ORIGIN,
) => {
  const event = new MessageEvent('message', {
    source: iframe?.contentWindow,
    origin,
    data: { event_id },
  });
  window.dispatchEvent(event);
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('OnRampIframe', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signed-URL fetch lifecycle', () => {
    it('renders <Spin /> while fetching the signed URL', () => {
      setupMocks();
      mockGetSignedUrl.mockReturnValue(new Promise(() => {})); // never resolves

      renderIframe();

      expect(document.querySelector('.ant-spin')).not.toBeNull();
      expect(document.querySelector('iframe')).toBeNull();
    });

    it('renders the iframe with the signed URL on success', async () => {
      setupMocks();
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
      setupMocks();
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
      setupMocks();
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
      expect(document.querySelector('iframe')).toBeNull();
    });

    it('re-fetches the signed URL when Retry is clicked', async () => {
      setupMocks();
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

  describe('postMessage event handling — origin + source guards', () => {
    const setupRendered = async () => {
      const mocks = setupMocks();
      mockGetSignedUrl.mockResolvedValue({ success: true, url: SIGNED_URL });
      renderIframe();
      await waitFor(() => {
        expect(document.querySelector('iframe')).not.toBeNull();
      });
      return { ...mocks, iframe: document.querySelector('iframe') };
    };

    it('closes the window on widget-close event from MoonPay origin', async () => {
      const { closeFn, iframe } = await setupRendered();
      dispatchMoonPayEvent(iframe, 'CLOSE_WIDGET');
      expect(closeFn).toHaveBeenCalledTimes(1);
    });

    it('calls transactionFailure on transaction-failed event (after delay)', async () => {
      const { transactionFailureFn, iframe } = await setupRendered();
      dispatchMoonPayEvent(iframe, 'TRANSACTION_FAILED');
      await Promise.resolve(); // delayInSeconds is mocked to resolve immediately
      expect(transactionFailureFn).toHaveBeenCalledTimes(1);
    });

    it('rejects events whose origin is not in the MoonPay allowlist', async () => {
      const { closeFn, iframe } = await setupRendered();
      dispatchMoonPayEvent(iframe, 'CLOSE_WIDGET', 'https://attacker.example');
      expect(closeFn).not.toHaveBeenCalled();
    });

    it('rejects events whose source is not the MoonPay iframe', async () => {
      const { closeFn } = await setupRendered();
      // Source is the window itself, not the iframe contentWindow
      const event = new MessageEvent('message', {
        source: window,
        origin: MOONPAY_ORIGIN,
        data: { event_id: 'CLOSE_WIDGET' },
      });
      window.dispatchEvent(event);
      expect(closeFn).not.toHaveBeenCalled();
    });

    it('ignores events with no event_id / type', async () => {
      const { closeFn, iframe } = await setupRendered();
      const event = new MessageEvent('message', {
        source: iframe?.contentWindow,
        origin: MOONPAY_ORIGIN,
        data: { someOther: 'field' },
      });
      window.dispatchEvent(event);
      expect(closeFn).not.toHaveBeenCalled();
    });

    it('logs the event_id via logEvent for observability', async () => {
      const { logEventFn, iframe } = await setupRendered();
      dispatchMoonPayEvent(iframe, 'CLOSE_WIDGET');
      expect(logEventFn).toHaveBeenCalledWith(
        expect.stringContaining('CLOSE_WIDGET'),
      );
    });
  });
});
