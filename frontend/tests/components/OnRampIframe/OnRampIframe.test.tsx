import { render } from '@testing-library/react';
import { createElement } from 'react';

import { useElectronApi } from '../../../hooks/useElectronApi';
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

jest.mock('../../../constants/urls', () => ({
  ON_RAMP_GATEWAY_URL: 'https://mock-transak.com/',
}));

jest.mock('../../../hooks/useElectronApi', () => ({
  useElectronApi: jest.fn(),
}));
jest.mock('../../../utils/delay', () => ({
  delayInSeconds: jest.fn(() => Promise.resolve()),
}));

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => createElement('img', props),
}));

// ---------------------------------------------------------------------------
// Typed mock accessors
// ---------------------------------------------------------------------------

const mockUseElectronApi = useElectronApi as jest.MockedFunction<
  typeof useElectronApi
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

const setupMocks = () => {
  mockUseElectronApi.mockReturnValue({
    onRampWindow: { close: jest.fn(), transactionFailure: jest.fn() },
    logEvent: jest.fn(),
  } as unknown as ReturnType<typeof useElectronApi>);
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('OnRampIframe', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('URL construction', () => {
    it('builds correct Transak URL with all params', () => {
      setupMocks();

      render(
        createElement(OnRampIframe, {
          usdAmountToPay: 18.17,
          networkName: 'base',
          cryptoCurrencyCode: 'ETH',
          walletAddress: DEFAULT_EOA_ADDRESS,
        }),
      );

      const iframe = document.querySelector('iframe');
      expect(iframe).not.toBeNull();

      const url = new URL(iframe!.src);
      expect(url.origin).toBe('https://mock-transak.com');
      expect(url.searchParams.get('productsAvailed')).toBe('BUY');
      expect(url.searchParams.get('paymentMethod')).toBe('credit_debit_card');
      expect(url.searchParams.get('network')).toBe('base');
      expect(url.searchParams.get('cryptoCurrencyCode')).toBe('ETH');
      expect(url.searchParams.get('fiatCurrency')).toBe('USD');
      expect(url.searchParams.get('fiatAmount')).toBe('18.17');
      expect(url.searchParams.get('walletAddress')).toBe(DEFAULT_EOA_ADDRESS);
      expect(url.searchParams.get('hideMenu')).toBe('true');
    });

    it('uses correct URL for Polygon (POL)', () => {
      setupMocks();

      render(
        createElement(OnRampIframe, {
          usdAmountToPay: 25,
          networkName: 'polygon',
          cryptoCurrencyCode: 'POL',
          walletAddress: DEFAULT_EOA_ADDRESS,
        }),
      );

      const iframe = document.querySelector('iframe');
      const url = new URL(iframe!.src);
      expect(url.searchParams.get('network')).toBe('polygon');
      expect(url.searchParams.get('cryptoCurrencyCode')).toBe('POL');
      expect(url.searchParams.get('fiatAmount')).toBe('25');
    });
  });

  describe('iframe event handling', () => {
    it('closes window on TRANSAK_WIDGET_CLOSE event', () => {
      const closeFn = jest.fn();
      mockUseElectronApi.mockReturnValue({
        onRampWindow: { close: closeFn, transactionFailure: jest.fn() },
        logEvent: jest.fn(),
      } as unknown as ReturnType<typeof useElectronApi>);

      render(
        createElement(OnRampIframe, {
          usdAmountToPay: 10,
          networkName: 'base',
          cryptoCurrencyCode: 'ETH',
          walletAddress: DEFAULT_EOA_ADDRESS,
        }),
      );

      const iframe = document.querySelector('iframe');

      // Simulate message from iframe
      const event = new MessageEvent('message', {
        source: iframe?.contentWindow,
        data: {
          event_id: 'TRANSAK_WIDGET_CLOSE',
          data: {},
        },
      });
      window.dispatchEvent(event);

      expect(closeFn).toHaveBeenCalled();
    });

    it('ignores message events with no data', () => {
      const closeFn = jest.fn();
      mockUseElectronApi.mockReturnValue({
        onRampWindow: { close: closeFn, transactionFailure: jest.fn() },
        logEvent: jest.fn(),
      } as unknown as ReturnType<typeof useElectronApi>);

      render(
        createElement(OnRampIframe, {
          usdAmountToPay: 10,
          networkName: 'base',
          cryptoCurrencyCode: 'ETH',
          walletAddress: DEFAULT_EOA_ADDRESS,
        }),
      );

      const iframe = document.querySelector('iframe');
      const event = new MessageEvent('message', {
        source: iframe?.contentWindow,
        data: undefined,
      });
      window.dispatchEvent(event);

      expect(closeFn).not.toHaveBeenCalled();
    });

    it('ignores message events with data but no event_id', () => {
      const closeFn = jest.fn();
      mockUseElectronApi.mockReturnValue({
        onRampWindow: { close: closeFn, transactionFailure: jest.fn() },
        logEvent: jest.fn(),
      } as unknown as ReturnType<typeof useElectronApi>);

      render(
        createElement(OnRampIframe, {
          usdAmountToPay: 10,
          networkName: 'base',
          cryptoCurrencyCode: 'ETH',
          walletAddress: DEFAULT_EOA_ADDRESS,
        }),
      );

      const iframe = document.querySelector('iframe');
      const event = new MessageEvent('message', {
        source: iframe?.contentWindow,
        data: { someOther: 'field' },
      });
      window.dispatchEvent(event);

      expect(closeFn).not.toHaveBeenCalled();
    });

    it('ignores message events from other sources', () => {
      const closeFn = jest.fn();
      mockUseElectronApi.mockReturnValue({
        onRampWindow: { close: closeFn, transactionFailure: jest.fn() },
        logEvent: jest.fn(),
      } as unknown as ReturnType<typeof useElectronApi>);

      render(
        createElement(OnRampIframe, {
          usdAmountToPay: 10,
          networkName: 'base',
          cryptoCurrencyCode: 'ETH',
          walletAddress: DEFAULT_EOA_ADDRESS,
        }),
      );

      // Simulate message from a different source (not the iframe)
      const event = new MessageEvent('message', {
        source: window,
        data: {
          event_id: 'TRANSAK_WIDGET_CLOSE',
          data: {},
        },
      });
      window.dispatchEvent(event);

      expect(closeFn).not.toHaveBeenCalled();
    });

    it('calls transactionFailure after delay on TRANSAK_ORDER_FAILED event', async () => {
      const transactionFailureFn = jest.fn();
      mockUseElectronApi.mockReturnValue({
        onRampWindow: {
          close: jest.fn(),
          transactionFailure: transactionFailureFn,
        },
        logEvent: jest.fn(),
      } as unknown as ReturnType<typeof useElectronApi>);

      render(
        createElement(OnRampIframe, {
          usdAmountToPay: 10,
          networkName: 'base',
          cryptoCurrencyCode: 'ETH',
          walletAddress: DEFAULT_EOA_ADDRESS,
        }),
      );

      const iframe = document.querySelector('iframe');
      const event = new MessageEvent('message', {
        source: iframe?.contentWindow,
        data: {
          event_id: 'TRANSAK_ORDER_FAILED',
          data: {},
        },
      });
      window.dispatchEvent(event);

      // delayInSeconds is mocked to resolve immediately
      await Promise.resolve();

      expect(transactionFailureFn).toHaveBeenCalledTimes(1);
    });
  });
});
