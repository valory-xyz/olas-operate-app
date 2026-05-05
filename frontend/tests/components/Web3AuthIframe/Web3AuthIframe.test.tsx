import { render } from '@testing-library/react';
import { act, createElement } from 'react';

import { useElectronApi } from '../../../hooks/useElectronApi';
import { BACKUP_SIGNER_ADDRESS } from '../../helpers/factories';

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

// antd/es/tooltip uses ESM that jest cannot parse — stub it out
jest.mock('antd/es/tooltip', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const React = require('react');
  const Tooltip = React.forwardRef(
    (props: { children?: React.ReactNode }, ref: React.Ref<HTMLDivElement>) =>
      React.createElement('div', { ref }, props.children),
  );
  Tooltip.displayName = 'Tooltip';
  return { __esModule: true, default: Tooltip };
});

const MOCK_WEB3AUTH_LOGIN_URL = 'https://mock-web3auth.com/login';

jest.mock('../../../constants/urls', () => ({
  ...jest.requireActual('../../../constants/urls'),
  WEB3AUTH_LOGIN_URL: MOCK_WEB3AUTH_LOGIN_URL,
}));

jest.mock('../../../hooks/useElectronApi', () => ({
  useElectronApi: jest.fn(),
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
  Web3AuthIframe,
} = require('../../../components/Web3AuthIframe/Web3AuthIframe');
/* eslint-enable @typescript-eslint/no-var-requires */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeElectronApiMocks = () => ({
  web3AuthWindow: {
    close: jest.fn(),
    authSuccess: jest.fn(),
  },
  logEvent: jest.fn(),
});

const setupMocks = (
  overrides?: Partial<ReturnType<typeof makeElectronApiMocks>>,
) => {
  const mocks = { ...makeElectronApiMocks(), ...overrides };
  mockUseElectronApi.mockReturnValue(
    mocks as unknown as ReturnType<typeof useElectronApi>,
  );
  return mocks;
};

/**
 * Dispatch a postMessage event that appears to come from the iframe.
 * We must read the iframe's contentWindow AFTER render.
 */
const dispatchIframeMessage = (
  data: Record<string, unknown>,
  source?: Window | null,
) => {
  const iframe = document.querySelector('iframe');
  const messageSource =
    source !== undefined ? source : (iframe?.contentWindow ?? null);
  const event = new MessageEvent('message', {
    source: messageSource,
    data,
  });
  act(() => {
    window.dispatchEvent(event);
  });
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Web3AuthIframe', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders an iframe with the correct src URL', () => {
      setupMocks();
      render(createElement(Web3AuthIframe));

      const iframe = document.querySelector('iframe');
      expect(iframe).not.toBeNull();
      expect(iframe!.src).toBe(MOCK_WEB3AUTH_LOGIN_URL);
    });

    it('renders iframe with correct id and allow attributes', () => {
      setupMocks();
      render(createElement(Web3AuthIframe));

      const iframe = document.querySelector('iframe');
      expect(iframe!.id).toBe('web3auth-iframe');
      expect(iframe!.getAttribute('allow')).toBe('camera;microphone;payment');
    });

    it('shows loading spinner initially', () => {
      setupMocks();
      render(createElement(Web3AuthIframe));

      // Ant Spin renders with .ant-spin class
      expect(document.querySelector('.ant-spin')).not.toBeNull();
    });
  });

  describe('event handling', () => {
    it('hides spinner on WEB3AUTH_MODAL_INITIALIZED event', () => {
      setupMocks();
      render(createElement(Web3AuthIframe));

      // Spinner is visible before the event
      expect(document.querySelector('.ant-spin')).not.toBeNull();

      dispatchIframeMessage({
        event_id: 'WEB3AUTH_MODAL_INITIALIZED',
      });

      // Spinner is gone after the event
      expect(document.querySelector('.ant-spin')).toBeNull();
    });

    it('calls web3AuthWindow.close on WEB3AUTH_MODAL_CLOSED event', () => {
      const mocks = setupMocks();
      render(createElement(Web3AuthIframe));

      dispatchIframeMessage({
        event_id: 'WEB3AUTH_MODAL_CLOSED',
      });

      expect(mocks.web3AuthWindow.close).toHaveBeenCalledTimes(1);
    });

    it('calls web3AuthWindow.authSuccess with address on WEB3AUTH_AUTH_SUCCESS event', () => {
      const mocks = setupMocks();
      render(createElement(Web3AuthIframe));

      dispatchIframeMessage({
        event_id: 'WEB3AUTH_AUTH_SUCCESS',
        address: BACKUP_SIGNER_ADDRESS,
      });

      expect(mocks.web3AuthWindow.authSuccess).toHaveBeenCalledTimes(1);
      expect(mocks.web3AuthWindow.authSuccess).toHaveBeenCalledWith(
        BACKUP_SIGNER_ADDRESS,
      );
    });

    it('does not call authSuccess when address is missing from WEB3AUTH_AUTH_SUCCESS event', () => {
      const mocks = setupMocks();
      render(createElement(Web3AuthIframe));

      dispatchIframeMessage({
        event_id: 'WEB3AUTH_AUTH_SUCCESS',
        // no address field
      });

      expect(mocks.web3AuthWindow.authSuccess).not.toHaveBeenCalled();
    });

    it('calls logEvent for each valid event', () => {
      const mocks = setupMocks();
      render(createElement(Web3AuthIframe));

      dispatchIframeMessage({ event_id: 'WEB3AUTH_MODAL_INITIALIZED' });
      expect(mocks.logEvent).toHaveBeenCalledWith(
        'Web3auth event: "WEB3AUTH_MODAL_INITIALIZED"',
      );

      dispatchIframeMessage({ event_id: 'WEB3AUTH_MODAL_CLOSED' });
      expect(mocks.logEvent).toHaveBeenCalledWith(
        'Web3auth event: "WEB3AUTH_MODAL_CLOSED"',
      );

      dispatchIframeMessage({
        event_id: 'WEB3AUTH_AUTH_SUCCESS',
        address: BACKUP_SIGNER_ADDRESS,
      });
      expect(mocks.logEvent).toHaveBeenCalledWith(
        'Web3auth event: "WEB3AUTH_AUTH_SUCCESS"',
      );

      expect(mocks.logEvent).toHaveBeenCalledTimes(3);
    });

    it('ignores events from other sources', () => {
      const mocks = setupMocks();
      render(createElement(Web3AuthIframe));

      // Dispatch from `window` itself, not the iframe
      dispatchIframeMessage({ event_id: 'WEB3AUTH_MODAL_CLOSED' }, window);

      expect(mocks.web3AuthWindow.close).not.toHaveBeenCalled();
      expect(mocks.logEvent).not.toHaveBeenCalled();
    });

    it('ignores events with no data', () => {
      const mocks = setupMocks();
      render(createElement(Web3AuthIframe));

      const iframe = document.querySelector('iframe');
      const event = new MessageEvent('message', {
        source: iframe?.contentWindow ?? null,
        data: undefined,
      });
      act(() => {
        window.dispatchEvent(event);
      });

      expect(mocks.logEvent).not.toHaveBeenCalled();
    });

    it('ignores events with no event_id', () => {
      const mocks = setupMocks();
      render(createElement(Web3AuthIframe));

      dispatchIframeMessage({ someOtherField: 'value' });

      expect(mocks.logEvent).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('removes message event listener on unmount', () => {
      const mocks = setupMocks();
      const { unmount } = render(createElement(Web3AuthIframe));

      unmount();

      // After unmount, dispatching a message should not trigger any handler
      const iframe = document.querySelector('iframe');
      // iframe is gone after unmount, so simulate with null source
      const event = new MessageEvent('message', {
        source: iframe?.contentWindow ?? null,
        data: { event_id: 'WEB3AUTH_MODAL_CLOSED' },
      });
      act(() => {
        window.dispatchEvent(event);
      });

      expect(mocks.web3AuthWindow.close).not.toHaveBeenCalled();
    });
  });
});
