import { render } from '@testing-library/react';
import { act, createElement } from 'react';

import { useElectronApi } from '../../../hooks/useElectronApi';
import {
  BACKUP_SIGNER_ADDRESS,
  DEFAULT_EOA_ADDRESS,
  DEFAULT_SAFE_ADDRESS,
  MOCK_TX_HASH_1,
  SECOND_SAFE_ADDRESS,
} from '../../helpers/factories';

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

const MOCK_WEB3AUTH_SWAP_OWNER_URL =
  'https://mock-web3auth.com/swap-owner-session';

jest.mock('../../../constants/urls', () => ({
  ...jest.requireActual('../../../constants/urls'),
  WEB3AUTH_SWAP_OWNER_URL: MOCK_WEB3AUTH_SWAP_OWNER_URL,
}));

jest.mock('../../../hooks', () => ({
  useElectronApi: jest.fn(),
}));

// Also mock the direct import path used elsewhere
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
  Web3AuthSwapOwnerIframe,
} = require('../../../components/Web3AuthIframe/Web3AuthSwapOwnerIframe');
/* eslint-enable @typescript-eslint/no-var-requires */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_CHAIN_ID = 100; // Gnosis

const DEFAULT_PROPS = {
  safeAddress: DEFAULT_SAFE_ADDRESS,
  oldOwnerAddress: DEFAULT_EOA_ADDRESS,
  newOwnerAddress: SECOND_SAFE_ADDRESS,
  backupOwnerAddress: BACKUP_SIGNER_ADDRESS,
  chainId: DEFAULT_CHAIN_ID,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeElectronApiMocks = () => ({
  web3AuthSwapOwnerWindow: {
    close: jest.fn(),
    swapSuccess: jest.fn(),
    swapFailure: jest.fn(),
  },
  logEvent: jest.fn(),
});

const setupMocks = (
  overrides?: Partial<ReturnType<typeof makeElectronApiMocks>>,
) => {
  const mocks = { ...makeElectronApiMocks(), ...overrides };

  // Both import paths must return the same mock
  mockUseElectronApi.mockReturnValue(
    mocks as unknown as ReturnType<typeof useElectronApi>,
  );

  // The component imports from '@/hooks' so we also need that mock aligned
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const hooksModule = require('../../../hooks') as {
    useElectronApi: jest.Mock;
  };
  hooksModule.useElectronApi.mockReturnValue(mocks);

  return mocks;
};

/**
 * Dispatch a postMessage event that appears to come from the iframe.
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

describe('Web3AuthSwapOwnerIframe', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders an iframe with correct query params from props', () => {
      setupMocks();
      render(createElement(Web3AuthSwapOwnerIframe, DEFAULT_PROPS));

      const iframe = document.querySelector('iframe');
      expect(iframe).not.toBeNull();

      const url = new URL(iframe!.src);
      expect(url.origin + url.pathname).toBe(MOCK_WEB3AUTH_SWAP_OWNER_URL);
      expect(url.searchParams.get('safeAddress')).toBe(
        DEFAULT_PROPS.safeAddress,
      );
      expect(url.searchParams.get('oldOwnerAddress')).toBe(
        DEFAULT_PROPS.oldOwnerAddress,
      );
      expect(url.searchParams.get('newOwnerAddress')).toBe(
        DEFAULT_PROPS.newOwnerAddress,
      );
      expect(url.searchParams.get('backupOwnerAddress')).toBe(
        DEFAULT_PROPS.backupOwnerAddress,
      );
      expect(url.searchParams.get('chainId')).toBe(
        String(DEFAULT_PROPS.chainId),
      );
    });

    it('renders iframe with correct id and allow attributes', () => {
      setupMocks();
      render(createElement(Web3AuthSwapOwnerIframe, DEFAULT_PROPS));

      const iframe = document.querySelector('iframe');
      expect(iframe!.id).toBe('web3auth-swap-owner-iframe');
      expect(iframe!.getAttribute('allow')).toBe('camera;microphone;payment');
    });

    it('shows loading spinner initially', () => {
      setupMocks();
      render(createElement(Web3AuthSwapOwnerIframe, DEFAULT_PROPS));

      expect(document.querySelector('.ant-spin')).not.toBeNull();
    });
  });

  describe('event handling', () => {
    it('hides spinner on WEB3AUTH_SWAP_OWNER_MODAL_INITIALIZED event', () => {
      setupMocks();
      render(createElement(Web3AuthSwapOwnerIframe, DEFAULT_PROPS));

      expect(document.querySelector('.ant-spin')).not.toBeNull();

      dispatchIframeMessage({
        event_id: 'WEB3AUTH_SWAP_OWNER_MODAL_INITIALIZED',
      });

      expect(document.querySelector('.ant-spin')).toBeNull();
    });

    it('calls web3AuthSwapOwnerWindow.close on WEB3AUTH_SWAP_OWNER_MODAL_CLOSED event', () => {
      const mocks = setupMocks();
      render(createElement(Web3AuthSwapOwnerIframe, DEFAULT_PROPS));

      dispatchIframeMessage({
        event_id: 'WEB3AUTH_SWAP_OWNER_MODAL_CLOSED',
      });

      expect(mocks.web3AuthSwapOwnerWindow.close).toHaveBeenCalledTimes(1);
    });

    it('calls swapSuccess with result on WEB3AUTH_SWAP_OWNER_SUCCESS event', () => {
      const mocks = setupMocks();
      render(createElement(Web3AuthSwapOwnerIframe, DEFAULT_PROPS));

      const successData = {
        event_id: 'WEB3AUTH_SWAP_OWNER_SUCCESS',
        success: true,
        txHash: MOCK_TX_HASH_1,
        chainId: DEFAULT_CHAIN_ID,
        safeAddress: DEFAULT_SAFE_ADDRESS,
      };

      dispatchIframeMessage(successData);

      expect(mocks.web3AuthSwapOwnerWindow.swapSuccess).toHaveBeenCalledTimes(
        1,
      );
      expect(mocks.web3AuthSwapOwnerWindow.swapSuccess).toHaveBeenCalledWith(
        successData,
      );
    });

    it('calls swapFailure with result on WEB3AUTH_SWAP_OWNER_FAILURE event', () => {
      const mocks = setupMocks();
      render(createElement(Web3AuthSwapOwnerIframe, DEFAULT_PROPS));

      const failureData = {
        event_id: 'WEB3AUTH_SWAP_OWNER_FAILURE',
        success: false,
        error: 'Transaction reverted',
        chainId: DEFAULT_CHAIN_ID,
        safeAddress: DEFAULT_SAFE_ADDRESS,
      };

      dispatchIframeMessage(failureData);

      expect(mocks.web3AuthSwapOwnerWindow.swapFailure).toHaveBeenCalledTimes(
        1,
      );
      expect(mocks.web3AuthSwapOwnerWindow.swapFailure).toHaveBeenCalledWith(
        failureData,
      );
    });

    it('calls logEvent for each valid event', () => {
      const mocks = setupMocks();
      render(createElement(Web3AuthSwapOwnerIframe, DEFAULT_PROPS));

      dispatchIframeMessage({
        event_id: 'WEB3AUTH_SWAP_OWNER_MODAL_INITIALIZED',
      });
      expect(mocks.logEvent).toHaveBeenCalledWith(
        'Web3auth event from iframe: "WEB3AUTH_SWAP_OWNER_MODAL_INITIALIZED"',
      );

      dispatchIframeMessage({
        event_id: 'WEB3AUTH_SWAP_OWNER_MODAL_CLOSED',
      });
      expect(mocks.logEvent).toHaveBeenCalledWith(
        'Web3auth event from iframe: "WEB3AUTH_SWAP_OWNER_MODAL_CLOSED"',
      );

      dispatchIframeMessage({
        event_id: 'WEB3AUTH_SWAP_OWNER_SUCCESS',
        success: true,
        txHash: MOCK_TX_HASH_1,
        chainId: DEFAULT_CHAIN_ID,
        safeAddress: DEFAULT_SAFE_ADDRESS,
      });
      expect(mocks.logEvent).toHaveBeenCalledWith(
        'Web3auth event from iframe: "WEB3AUTH_SWAP_OWNER_SUCCESS"',
      );

      dispatchIframeMessage({
        event_id: 'WEB3AUTH_SWAP_OWNER_FAILURE',
        success: false,
        error: 'fail',
        chainId: DEFAULT_CHAIN_ID,
        safeAddress: DEFAULT_SAFE_ADDRESS,
      });
      expect(mocks.logEvent).toHaveBeenCalledWith(
        'Web3auth event from iframe: "WEB3AUTH_SWAP_OWNER_FAILURE"',
      );

      expect(mocks.logEvent).toHaveBeenCalledTimes(4);
    });

    it('ignores events from other sources', () => {
      const mocks = setupMocks();
      render(createElement(Web3AuthSwapOwnerIframe, DEFAULT_PROPS));

      dispatchIframeMessage(
        { event_id: 'WEB3AUTH_SWAP_OWNER_MODAL_CLOSED' },
        window,
      );

      expect(mocks.web3AuthSwapOwnerWindow.close).not.toHaveBeenCalled();
      expect(mocks.logEvent).not.toHaveBeenCalled();
    });

    it('ignores events with no data', () => {
      const mocks = setupMocks();
      render(createElement(Web3AuthSwapOwnerIframe, DEFAULT_PROPS));

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
      render(createElement(Web3AuthSwapOwnerIframe, DEFAULT_PROPS));

      dispatchIframeMessage({ someOtherField: 'value' });

      expect(mocks.logEvent).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('removes message event listener on unmount', () => {
      const mocks = setupMocks();
      const { unmount } = render(
        createElement(Web3AuthSwapOwnerIframe, DEFAULT_PROPS),
      );

      unmount();

      // After unmount, dispatching a message should not trigger any handler
      const event = new MessageEvent('message', {
        source: null,
        data: { event_id: 'WEB3AUTH_SWAP_OWNER_MODAL_CLOSED' },
      });
      act(() => {
        window.dispatchEvent(event);
      });

      expect(mocks.web3AuthSwapOwnerWindow.close).not.toHaveBeenCalled();
    });
  });
});
