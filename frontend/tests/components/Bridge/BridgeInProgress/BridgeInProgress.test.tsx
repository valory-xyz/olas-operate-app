import { render, screen } from '@testing-library/react';
import { act, createElement } from 'react';

import { TokenSymbolMap } from '../../../../config/tokens';
import { MiddlewareChainMap } from '../../../../constants/chains';
import { BridgeStatuses, BridgingStepStatus } from '../../../../types/Bridge';
import { Nullable } from '../../../../types/Util';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../../../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../../../constants/providers', () => ({}));
jest.mock('../../../../config/providers', () => ({ providers: [] }));

// Mock antd
jest.mock('antd', () => ({
  Flex: ({ children }: { children: React.ReactNode }) =>
    createElement('div', { 'data-testid': 'flex' }, children),
  Typography: {
    Text: ({ children }: { children: React.ReactNode }) =>
      createElement('span', null, children),
    Title: ({ children }: { children: React.ReactNode }) =>
      createElement('h1', null, children),
  },
}));

// Mock UI components
jest.mock('../../../../components/ui', () => ({
  Alert: ({ message }: { message: string }) =>
    createElement('div', { 'data-testid': 'alert' }, message),
  CardFlex: ({ children }: { children: React.ReactNode }) =>
    createElement('div', null, children),
}));

// Mock BridgeTransferFlow
jest.mock('../../../../components/Bridge/BridgeTransferFlow', () => ({
  BridgeTransferFlow: (props: { isBridgeCompleted?: boolean }) =>
    createElement('div', {
      'data-testid': 'transfer-flow',
      'data-completed': String(props.isBridgeCompleted),
    }),
}));

// Mock BridgingSteps — capture full bridge prop for testing onRetry
let lastBridgingStepsProps: Record<string, unknown> = {};
jest.mock(
  '../../../../components/Bridge/BridgeInProgress/BridgingSteps',
  () => ({
    BridgingSteps: (props: {
      bridge?: { status: string; subSteps: unknown[] };
    }) => {
      lastBridgingStepsProps = props as Record<string, unknown>;
      return createElement('div', {
        'data-testid': 'bridging-steps',
        'data-bridge-status': props.bridge?.status,
      });
    },
  }),
);

// Mock hooks
const mockUseBridgingSteps = jest.fn();
const mockUsePageState = jest.fn();
jest.mock('../../../../hooks', () => ({
  useBridgingSteps: (...args: unknown[]) => mockUseBridgingSteps(...args),
  usePageState: () => mockUsePageState(),
}));

const mockUseMasterSafeCreateAndTransferSteps = jest.fn();
jest.mock(
  '../../../../components/Bridge/BridgeInProgress/useMasterSafeCreateAndTransferSteps',
  () => ({
    useMasterSafeCreateAndTransferSteps: (...args: unknown[]) =>
      mockUseMasterSafeCreateAndTransferSteps(...args),
  }),
);

const mockRefetchBridgeExecute = jest.fn();
jest.mock(
  '../../../../components/Bridge/BridgeInProgress/useRetryBridge',
  () => ({
    useRetryBridge: () => mockRefetchBridgeExecute,
  }),
);

// ---------------------------------------------------------------------------
// Import component under test AFTER mocks
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-var-requires */
const { BridgeInProgress } =
  require('../../../../components/Bridge/BridgeInProgress/BridgeInProgress') as {
    BridgeInProgress: React.ComponentType<BridgeInProgressProps>;
  };
/* eslint-enable @typescript-eslint/no-var-requires */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BridgeRetryOutcome = 'NEED_REFILL';

type BridgeInProgressProps = {
  quoteId: string;
  mode?: 'onboard' | 'deposit';
  areAllStepsCompleted?: boolean;
  bridgeRetryOutcome: Nullable<BridgeRetryOutcome>;
  onBridgeRetryOutcome: (outcome: Nullable<BridgeRetryOutcome>) => void;
  onNext: () => void;
  fromChain: string;
  toChain: string;
  transfers: {
    fromSymbol: string;
    fromAmount: string;
    toSymbol: string;
    toAmount: string;
    decimals?: number;
  }[];
  eta?: number;
};

type BridgingStepsReturn = {
  isBridging: boolean;
  isBridgingFailed: boolean;
  isBridgingCompleted: boolean;
  bridgeStatus: BridgeStatuses | null;
};

type MasterSafeStepsReturn = {
  steps: {
    masterSafeCreation:
      | undefined
      | { status: BridgingStepStatus; subSteps: unknown[] };
    masterSafeTransfer:
      | undefined
      | { status: BridgingStepStatus; subSteps: unknown[] };
  };
  shouldCreateMasterSafe: boolean;
  isMasterWalletFetched: boolean;
  isLoadingMasterSafeCreation: boolean;
  isSafeCreationAndTransferCompleted: boolean;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultBridging: BridgingStepsReturn = {
  isBridging: false,
  isBridgingFailed: false,
  isBridgingCompleted: false,
  bridgeStatus: null,
};

const defaultMasterSafe: MasterSafeStepsReturn = {
  steps: { masterSafeCreation: undefined, masterSafeTransfer: undefined },
  shouldCreateMasterSafe: false,
  isMasterWalletFetched: true,
  isLoadingMasterSafeCreation: false,
  isSafeCreationAndTransferCompleted: false,
};

const setupMocks = (
  overrides: {
    bridging?: Partial<BridgingStepsReturn>;
    masterSafe?: Partial<MasterSafeStepsReturn>;
  } = {},
) => {
  mockUseBridgingSteps.mockReturnValue({
    ...defaultBridging,
    ...overrides.bridging,
  });
  mockUseMasterSafeCreateAndTransferSteps.mockReturnValue({
    ...defaultMasterSafe,
    ...overrides.masterSafe,
  });
  mockUsePageState.mockReturnValue({ goto: jest.fn() });
  mockRefetchBridgeExecute.mockResolvedValue(undefined);
};

const defaultProps: BridgeInProgressProps = {
  quoteId: 'quote-123',
  fromChain: MiddlewareChainMap.ETHEREUM,
  toChain: MiddlewareChainMap.GNOSIS,
  transfers: [
    {
      fromSymbol: TokenSymbolMap.ETH,
      toSymbol: TokenSymbolMap.XDAI,
      fromAmount: '1000000000000000000',
      toAmount: '2000000000000000000',
      decimals: 18,
    },
  ],
  bridgeRetryOutcome: null,
  onBridgeRetryOutcome: jest.fn(),
  onNext: jest.fn(),
  eta: 300,
};

const renderComponent = (overrides: Partial<BridgeInProgressProps> = {}) =>
  render(createElement(BridgeInProgress, { ...defaultProps, ...overrides }));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BridgeInProgress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    lastBridgingStepsProps = {};
  });

  // -------------------------------------------------------------------------
  // bridgeDetails status derivation
  // -------------------------------------------------------------------------
  describe('bridgeDetails status derivation', () => {
    it('returns "wait" when bridgeRetryOutcome is NEED_REFILL', () => {
      setupMocks({
        bridging: {
          bridgeStatus: [
            { symbol: TokenSymbolMap.XDAI, status: 'process', txnLink: null },
          ],
        },
      });
      renderComponent({ bridgeRetryOutcome: 'NEED_REFILL' });

      const stepsEl = screen.getByTestId('bridging-steps');
      expect(stepsEl.getAttribute('data-bridge-status')).toBe('wait');
    });

    it('returns "error" when isBridgingFailed is true', () => {
      setupMocks({
        bridging: {
          isBridgingFailed: true,
          bridgeStatus: [
            { symbol: TokenSymbolMap.XDAI, status: 'error', txnLink: null },
          ],
        },
      });
      renderComponent();

      const stepsEl = screen.getByTestId('bridging-steps');
      expect(stepsEl.getAttribute('data-bridge-status')).toBe('error');
    });

    it('returns "process" when isBridging is true', () => {
      setupMocks({
        bridging: {
          isBridging: true,
          bridgeStatus: [
            { symbol: TokenSymbolMap.XDAI, status: 'process', txnLink: null },
          ],
        },
      });
      renderComponent();

      const stepsEl = screen.getByTestId('bridging-steps');
      expect(stepsEl.getAttribute('data-bridge-status')).toBe('process');
    });

    it('returns "wait" when bridgeStatus is null', () => {
      setupMocks({
        bridging: { bridgeStatus: null },
      });
      renderComponent();

      const stepsEl = screen.getByTestId('bridging-steps');
      expect(stepsEl.getAttribute('data-bridge-status')).toBe('wait');
    });

    it('returns "finish" when isBridgingCompleted is true', () => {
      setupMocks({
        bridging: {
          isBridgingCompleted: true,
          bridgeStatus: [
            { symbol: TokenSymbolMap.XDAI, status: 'finish', txnLink: null },
          ],
        },
      });
      renderComponent();

      const stepsEl = screen.getByTestId('bridging-steps');
      expect(stepsEl.getAttribute('data-bridge-status')).toBe('finish');
    });

    it('returns "process" as fallback when bridgeStatus exists but not completed', () => {
      setupMocks({
        bridging: {
          isBridging: false,
          isBridgingFailed: false,
          isBridgingCompleted: false,
          bridgeStatus: [
            { symbol: TokenSymbolMap.XDAI, status: 'process', txnLink: null },
          ],
        },
      });
      renderComponent();

      const stepsEl = screen.getByTestId('bridging-steps');
      expect(stepsEl.getAttribute('data-bridge-status')).toBe('process');
    });
  });

  // -------------------------------------------------------------------------
  // estimatedTimeInMinutes
  // -------------------------------------------------------------------------
  describe('estimatedTimeInMinutes', () => {
    it('renders ~5 minutes for eta=300', () => {
      setupMocks();
      renderComponent({ eta: 300 });
      expect(screen.getByText(/~5 minutes/)).toBeInTheDocument();
    });

    it('renders ~1 minutes (min 1) for eta=0', () => {
      setupMocks();
      renderComponent({ eta: 0 });
      expect(screen.getByText(/~1 minutes/)).toBeInTheDocument();
    });

    it('renders ~1 minutes for eta=59', () => {
      setupMocks();
      renderComponent({ eta: 59 });
      expect(screen.getByText(/~1 minutes/)).toBeInTheDocument();
    });

    it('renders ~1 minutes for undefined eta', () => {
      setupMocks();
      renderComponent({ eta: undefined });
      expect(screen.getByText(/~1 minutes/)).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // completion effect
  // -------------------------------------------------------------------------
  describe('completion effect', () => {
    it('does NOT call onNext when bridgeRetryOutcome is NEED_REFILL', () => {
      const onNext = jest.fn();
      setupMocks({
        bridging: { isBridgingCompleted: true },
        masterSafe: {
          isMasterWalletFetched: true,
          shouldCreateMasterSafe: false,
        },
      });
      renderComponent({ onNext, bridgeRetryOutcome: 'NEED_REFILL' });
      expect(onNext).not.toHaveBeenCalled();
    });

    it('does NOT call onNext when isBridging is true', () => {
      const onNext = jest.fn();
      setupMocks({
        bridging: { isBridging: true, isBridgingCompleted: true },
        masterSafe: {
          isMasterWalletFetched: true,
          shouldCreateMasterSafe: false,
        },
      });
      renderComponent({ onNext });
      expect(onNext).not.toHaveBeenCalled();
    });

    it('does NOT call onNext when isBridgingFailed is true', () => {
      const onNext = jest.fn();
      setupMocks({
        bridging: { isBridgingFailed: true, isBridgingCompleted: true },
        masterSafe: {
          isMasterWalletFetched: true,
          shouldCreateMasterSafe: false,
        },
      });
      renderComponent({ onNext });
      expect(onNext).not.toHaveBeenCalled();
    });

    it('does NOT call onNext when isBridgingCompleted is false', () => {
      const onNext = jest.fn();
      setupMocks({
        bridging: { isBridgingCompleted: false },
        masterSafe: {
          isMasterWalletFetched: true,
          shouldCreateMasterSafe: false,
        },
      });
      renderComponent({ onNext });
      expect(onNext).not.toHaveBeenCalled();
    });

    it('does NOT call onNext when isMasterWalletFetched is false', () => {
      const onNext = jest.fn();
      setupMocks({
        bridging: { isBridgingCompleted: true },
        masterSafe: {
          isMasterWalletFetched: false,
          shouldCreateMasterSafe: false,
        },
      });
      renderComponent({ onNext });
      expect(onNext).not.toHaveBeenCalled();
    });

    it('does NOT call onNext when areAllStepsCompleted is true', () => {
      const onNext = jest.fn();
      setupMocks({
        bridging: { isBridgingCompleted: true },
        masterSafe: {
          isMasterWalletFetched: true,
          shouldCreateMasterSafe: false,
        },
      });
      renderComponent({ onNext, areAllStepsCompleted: true });
      expect(onNext).not.toHaveBeenCalled();
    });

    it('calls onNext when bridging completed and shouldCreateMasterSafe is false', () => {
      const onNext = jest.fn();
      setupMocks({
        bridging: { isBridgingCompleted: true },
        masterSafe: {
          isMasterWalletFetched: true,
          shouldCreateMasterSafe: false,
        },
      });
      renderComponent({ onNext });
      expect(onNext).toHaveBeenCalledTimes(1);
    });

    it('does NOT call onNext when shouldCreateMasterSafe is true but creation is loading', () => {
      const onNext = jest.fn();
      setupMocks({
        bridging: { isBridgingCompleted: true },
        masterSafe: {
          isMasterWalletFetched: true,
          shouldCreateMasterSafe: true,
          isLoadingMasterSafeCreation: true,
          isSafeCreationAndTransferCompleted: false,
        },
      });
      renderComponent({ onNext });
      expect(onNext).not.toHaveBeenCalled();
    });

    it('does NOT call onNext when shouldCreateMasterSafe is true but creation not completed', () => {
      const onNext = jest.fn();
      setupMocks({
        bridging: { isBridgingCompleted: true },
        masterSafe: {
          isMasterWalletFetched: true,
          shouldCreateMasterSafe: true,
          isLoadingMasterSafeCreation: false,
          isSafeCreationAndTransferCompleted: false,
        },
      });
      renderComponent({ onNext });
      expect(onNext).not.toHaveBeenCalled();
    });

    it('calls onNext when bridging completed and masterSafe creation completed', () => {
      const onNext = jest.fn();
      setupMocks({
        bridging: { isBridgingCompleted: true },
        masterSafe: {
          isMasterWalletFetched: true,
          shouldCreateMasterSafe: true,
          isLoadingMasterSafeCreation: false,
          isSafeCreationAndTransferCompleted: true,
        },
      });
      renderComponent({ onNext });
      expect(onNext).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // BridgeTransferFlow passthrough
  // -------------------------------------------------------------------------
  describe('BridgeTransferFlow passthrough', () => {
    it('passes isBridgeCompleted from areAllStepsCompleted (false)', () => {
      setupMocks();
      renderComponent({ areAllStepsCompleted: false });

      const flow = screen.getByTestId('transfer-flow');
      expect(flow.getAttribute('data-completed')).toBe('false');
    });

    it('passes isBridgeCompleted from areAllStepsCompleted (true)', () => {
      setupMocks();
      renderComponent({ areAllStepsCompleted: true });

      const flow = screen.getByTestId('transfer-flow');
      expect(flow.getAttribute('data-completed')).toBe('true');
    });
  });

  // -------------------------------------------------------------------------
  // Static content
  // -------------------------------------------------------------------------
  describe('static content', () => {
    it('renders the "Bridge Crypto" title', () => {
      setupMocks();
      renderComponent();
      expect(screen.getByText('Bridge Crypto')).toBeInTheDocument();
    });

    it('renders the "Step 2. Bridging In Progress" subtitle', () => {
      setupMocks();
      renderComponent();
      expect(
        screen.getByText('Step 2. Bridging In Progress'),
      ).toBeInTheDocument();
    });

    it('renders the keep-app-open alert', () => {
      setupMocks();
      renderComponent();
      expect(screen.getByTestId('alert')).toBeInTheDocument();
      expect(
        screen.getByText('Keep the app open until the process is complete.'),
      ).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // onBridgeFailRetry callback (lines 114-121)
  // -------------------------------------------------------------------------
  describe('onBridgeFailRetry callback', () => {
    it('calls refetchBridgeExecute and forwards the outcome', async () => {
      setupMocks({
        bridging: {
          isBridgingFailed: true,
          bridgeStatus: [
            { symbol: TokenSymbolMap.XDAI, status: 'error', txnLink: null },
          ],
        },
      });
      const onBridgeRetryOutcome = jest.fn();
      renderComponent({ onBridgeRetryOutcome });

      // Extract onRetry from the bridge subSteps passed to BridgingSteps
      const bridgeProp = lastBridgingStepsProps.bridge as {
        status: string;
        subSteps: Array<{
          onRetry?: () => void;
          onRetryProps?: { isLoading: boolean };
        }>;
      };
      expect(bridgeProp.subSteps).toHaveLength(1);
      const { onRetry } = bridgeProp.subSteps[0];
      expect(onRetry).toBeDefined();

      // Call onRetry (which triggers onBridgeFailRetry internally)
      await act(async () => {
        onRetry!();
        await Promise.resolve();
      });

      // refetchBridgeExecute should have been called with a callback
      expect(mockRefetchBridgeExecute).toHaveBeenCalledTimes(1);
      const callbackArg = mockRefetchBridgeExecute.mock.calls[0][0];
      expect(typeof callbackArg).toBe('function');

      // The callback should forward to onBridgeRetryOutcome
      callbackArg('NEED_REFILL');
      expect(onBridgeRetryOutcome).toHaveBeenCalledWith('NEED_REFILL');
    });
  });
});
