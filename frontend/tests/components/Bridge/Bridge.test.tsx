import { render, waitFor } from '@testing-library/react';
import { act, createElement } from 'react';

import { MiddlewareChainMap } from '../../../constants/chains';
import { PAGES } from '../../../constants/pages';

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

const mockGoto = jest.fn();
jest.mock('../../../hooks', () => ({
  usePageState: jest.fn(() => ({ goto: mockGoto })),
}));

// Store render props from child components for testing
let bridgeOnEvmProps: Record<string, unknown> = {};
let bridgeInProgressProps: Record<string, unknown> = {};

jest.mock('../../../components/Bridge/BridgeOnEvm/BridgeOnEvm', () => ({
  BridgeOnEvm: (props: Record<string, unknown>) => {
    bridgeOnEvmProps = props;
    return createElement('div', { 'data-testid': 'bridge-on-evm' });
  },
}));

jest.mock(
  '../../../components/Bridge/BridgeInProgress/BridgeInProgress',
  () => ({
    BridgeInProgress: (props: Record<string, unknown>) => {
      bridgeInProgressProps = props;
      return createElement('div', { 'data-testid': 'bridge-in-progress' });
    },
  }),
);

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-var-requires */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Bridge } = require('../../../components/Bridge/Bridge');
/* eslint-enable @typescript-eslint/no-var-requires */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockGetBridgeRequirementsParams = jest.fn().mockReturnValue({
  bridge_requests: [],
  force_update: false,
});
const mockOnPrevBeforeBridging = jest.fn();
const mockOnBridgingCompleted = jest.fn();

const defaultProps = {
  bridgeToChain: MiddlewareChainMap.GNOSIS,
  getBridgeRequirementsParams: mockGetBridgeRequirementsParams,
  onPrevBeforeBridging: mockOnPrevBeforeBridging,
  onBridgingCompleted: mockOnBridgingCompleted,
};

const renderBridge = (overrides: Record<string, unknown> = {}) =>
  render(createElement(Bridge, { ...defaultProps, ...overrides }));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Bridge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    bridgeOnEvmProps = {};
    bridgeInProgressProps = {};
  });

  describe('initial state (depositing)', () => {
    it('renders BridgeOnEvm in depositing state', () => {
      const { getByTestId } = renderBridge();
      expect(getByTestId('bridge-on-evm')).toBeTruthy();
    });

    it('defaults fromChain to ethereum when not specified', () => {
      renderBridge();
      expect(bridgeOnEvmProps.fromChain).toBe(MiddlewareChainMap.ETHEREUM);
    });

    it('uses provided fromChain', () => {
      renderBridge({ fromChain: MiddlewareChainMap.BASE });
      expect(bridgeOnEvmProps.fromChain).toBe(MiddlewareChainMap.BASE);
    });

    it('defaults mode to deposit', () => {
      renderBridge();
      // mode is used internally, not passed to BridgeOnEvm
      // verifying it doesn't crash without mode
      expect(bridgeOnEvmProps.fromChain).toBe(MiddlewareChainMap.ETHEREUM);
    });

    it('passes getBridgeRequirementsParams to BridgeOnEvm', () => {
      renderBridge();
      expect(bridgeOnEvmProps.getBridgeRequirementsParams).toBe(
        mockGetBridgeRequirementsParams,
      );
    });

    it('passes onPrevBeforeBridging as onPrev to BridgeOnEvm', () => {
      renderBridge();
      expect(bridgeOnEvmProps.onPrev).toBe(mockOnPrevBeforeBridging);
    });
  });

  describe('state transitions via handleNextStep', () => {
    it('transitions from depositing to in_progress', () => {
      const { getByTestId, queryByTestId } = renderBridge();

      // Initially shows BridgeOnEvm
      expect(getByTestId('bridge-on-evm')).toBeTruthy();

      // But calling onNext without quoteId/transferDetails will throw
      // We need to set them first via the callbacks
      const updateQuoteId = bridgeOnEvmProps.updateQuoteId as (
        id: string,
      ) => void;
      const updateCrossChainTransferDetails =
        bridgeOnEvmProps.updateCrossChainTransferDetails as (
          details: unknown,
        ) => void;
      const onNext = bridgeOnEvmProps.onNext as () => void;

      act(() => {
        updateQuoteId('quote-abc');
        updateCrossChainTransferDetails({
          fromChain: MiddlewareChainMap.ETHEREUM,
          toChain: MiddlewareChainMap.GNOSIS,
          eta: 300,
          transfers: [],
        });
      });

      act(() => {
        onNext();
      });

      // Now shows BridgeInProgress
      expect(getByTestId('bridge-in-progress')).toBeTruthy();
      expect(queryByTestId('bridge-on-evm')).toBeNull();
    });

    it('throws when transitioning to in_progress without quoteId', () => {
      renderBridge();
      const onNext = bridgeOnEvmProps.onNext as () => void;

      expect(() => {
        act(() => {
          onNext();
        });
      }).toThrow('Quote ID is required for in progress state');
    });

    it('throws when transitioning to in_progress without transfer details', () => {
      renderBridge();
      const updateQuoteId = bridgeOnEvmProps.updateQuoteId as (
        id: string,
      ) => void;
      const onNext = bridgeOnEvmProps.onNext as () => void;

      act(() => {
        updateQuoteId('quote-abc');
      });

      expect(() => {
        act(() => {
          onNext();
        });
      }).toThrow(
        'Transfer and receiving amounts are required for in progress state',
      );
    });
  });

  describe('in_progress state', () => {
    const transitionToInProgress = () => {
      const result = renderBridge();
      const updateQuoteId = bridgeOnEvmProps.updateQuoteId as (
        id: string,
      ) => void;
      const updateCrossChainTransferDetails =
        bridgeOnEvmProps.updateCrossChainTransferDetails as (
          details: unknown,
        ) => void;
      const onNext = bridgeOnEvmProps.onNext as () => void;

      act(() => {
        updateQuoteId('quote-xyz');
        updateCrossChainTransferDetails({
          fromChain: MiddlewareChainMap.ETHEREUM,
          toChain: MiddlewareChainMap.GNOSIS,
          eta: 600,
          transfers: [
            {
              fromSymbol: 'ETH',
              toSymbol: 'XDAI',
              fromAmount: '1000000000000000000',
              toAmount: '2000000000000000000',
              decimals: 18,
            },
          ],
        });
      });

      act(() => {
        onNext();
      });

      return result;
    };

    it('passes quoteId to BridgeInProgress', () => {
      transitionToInProgress();
      expect(bridgeInProgressProps.quoteId).toBe('quote-xyz');
    });

    it('passes mode to BridgeInProgress', () => {
      renderBridge({ mode: 'onboard' });
      const updateQuoteId = bridgeOnEvmProps.updateQuoteId as (
        id: string,
      ) => void;
      const updateCrossChainTransferDetails =
        bridgeOnEvmProps.updateCrossChainTransferDetails as (
          details: unknown,
        ) => void;
      const onNext = bridgeOnEvmProps.onNext as () => void;

      act(() => {
        updateQuoteId('q1');
        updateCrossChainTransferDetails({
          fromChain: MiddlewareChainMap.ETHEREUM,
          toChain: MiddlewareChainMap.GNOSIS,
          eta: 100,
          transfers: [],
        });
      });

      act(() => {
        onNext();
      });

      expect(bridgeInProgressProps.mode).toBe('onboard');
    });

    it('passes areAllStepsCompleted=false in in_progress state', () => {
      transitionToInProgress();
      expect(bridgeInProgressProps.areAllStepsCompleted).toBe(false);
    });

    it('passes transfer details spread to BridgeInProgress', () => {
      transitionToInProgress();
      expect(bridgeInProgressProps.fromChain).toBe(MiddlewareChainMap.ETHEREUM);
      expect(bridgeInProgressProps.toChain).toBe(MiddlewareChainMap.GNOSIS);
      expect(bridgeInProgressProps.eta).toBe(600);
    });
  });

  describe('completed state', () => {
    it('calls onBridgingCompleted when entering completed state', async () => {
      renderBridge();
      const updateQuoteId = bridgeOnEvmProps.updateQuoteId as (
        id: string,
      ) => void;
      const updateCrossChainTransferDetails =
        bridgeOnEvmProps.updateCrossChainTransferDetails as (
          details: unknown,
        ) => void;

      act(() => {
        updateQuoteId('q1');
        updateCrossChainTransferDetails({
          fromChain: MiddlewareChainMap.ETHEREUM,
          toChain: MiddlewareChainMap.GNOSIS,
          eta: 100,
          transfers: [],
        });
      });

      // Transition: depositing → in_progress
      const onNextDepositing = bridgeOnEvmProps.onNext as () => void;
      act(() => {
        onNextDepositing();
      });

      // Transition: in_progress → completed
      const onNextInProgress = bridgeInProgressProps.onNext as () => void;
      act(() => {
        onNextInProgress();
      });

      await waitFor(() => {
        expect(mockOnBridgingCompleted).toHaveBeenCalledTimes(1);
      });
    });

    it('does not call onBridgingCompleted if callback is undefined', async () => {
      renderBridge({ onBridgingCompleted: undefined });
      const updateQuoteId = bridgeOnEvmProps.updateQuoteId as (
        id: string,
      ) => void;
      const updateCrossChainTransferDetails =
        bridgeOnEvmProps.updateCrossChainTransferDetails as (
          details: unknown,
        ) => void;

      act(() => {
        updateQuoteId('q1');
        updateCrossChainTransferDetails({
          fromChain: MiddlewareChainMap.ETHEREUM,
          toChain: MiddlewareChainMap.GNOSIS,
          eta: 100,
          transfers: [],
        });
      });

      const onNextDepositing = bridgeOnEvmProps.onNext as () => void;
      act(() => {
        onNextDepositing();
      });

      const onNextInProgress = bridgeInProgressProps.onNext as () => void;
      act(() => {
        onNextInProgress();
      });

      // No crash, just doesn't call
      expect(mockOnBridgingCompleted).not.toHaveBeenCalled();
    });
  });

  describe('retry outcome (NEED_REFILL)', () => {
    it('resets to depositing state on NEED_REFILL', async () => {
      const { getByTestId } = renderBridge();
      const updateQuoteId = bridgeOnEvmProps.updateQuoteId as (
        id: string,
      ) => void;
      const updateCrossChainTransferDetails =
        bridgeOnEvmProps.updateCrossChainTransferDetails as (
          details: unknown,
        ) => void;

      act(() => {
        updateQuoteId('q1');
        updateCrossChainTransferDetails({
          fromChain: MiddlewareChainMap.ETHEREUM,
          toChain: MiddlewareChainMap.GNOSIS,
          eta: 100,
          transfers: [],
        });
      });

      // Transition to in_progress
      const onNextDepositing = bridgeOnEvmProps.onNext as () => void;
      act(() => {
        onNextDepositing();
      });

      expect(getByTestId('bridge-in-progress')).toBeTruthy();

      // Trigger NEED_REFILL via onBridgeRetryOutcome
      const onBridgeRetryOutcome =
        bridgeInProgressProps.onBridgeRetryOutcome as (
          outcome: string | null,
        ) => void;

      act(() => {
        onBridgeRetryOutcome('NEED_REFILL');
      });

      // Should go back to depositing
      await waitFor(() => {
        expect(getByTestId('bridge-on-evm')).toBeTruthy();
      });
    });
  });

  describe('handleNextStep completed → goto Main', () => {
    it('navigates to Main page when handleNextStep called in completed state', async () => {
      renderBridge();
      const updateQuoteId = bridgeOnEvmProps.updateQuoteId as (
        id: string,
      ) => void;
      const updateCrossChainTransferDetails =
        bridgeOnEvmProps.updateCrossChainTransferDetails as (
          details: unknown,
        ) => void;

      act(() => {
        updateQuoteId('q1');
        updateCrossChainTransferDetails({
          fromChain: MiddlewareChainMap.ETHEREUM,
          toChain: MiddlewareChainMap.GNOSIS,
          eta: 100,
          transfers: [],
        });
      });

      // depositing → in_progress
      act(() => {
        (bridgeOnEvmProps.onNext as () => void)();
      });

      // in_progress → completed
      act(() => {
        (bridgeInProgressProps.onNext as () => void)();
      });

      // completed → goto Main
      // BridgeInProgress is still rendered (same component for both states)
      // Its onNext would be called again
      act(() => {
        (bridgeInProgressProps.onNext as () => void)();
      });

      expect(mockGoto).toHaveBeenCalledWith(PAGES.Main);
    });
  });
});
