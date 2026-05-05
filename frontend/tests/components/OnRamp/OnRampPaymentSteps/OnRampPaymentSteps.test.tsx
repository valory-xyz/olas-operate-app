import { render } from '@testing-library/react';
import { act, createElement } from 'react';

import { GetOnRampRequirementsParams } from '../../../../components/OnRamp/types';
import { EvmChainIdMap } from '../../../../constants/chains';

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

// Mock hooks
const mockUseOnRampContext = jest.fn();
jest.mock('../../../../hooks/useOnRampContext', () => ({
  useOnRampContext: () => mockUseOnRampContext(),
}));

const mockUseBuyCryptoStep = jest.fn();
jest.mock(
  '../../../../components/OnRamp/OnRampPaymentSteps/useBuyCryptoStep',
  () => ({
    useBuyCryptoStep: () => mockUseBuyCryptoStep(),
  }),
);

const mockUseSwapFundsStep = jest.fn();
jest.mock(
  '../../../../components/OnRamp/OnRampPaymentSteps/useSwapFundsStep',
  () => ({
    useSwapFundsStep: (...args: unknown[]) => mockUseSwapFundsStep(...args),
  }),
);

const mockUseCreateAndTransferFundsToMasterSafeSteps = jest.fn();
jest.mock(
  '../../../../components/OnRamp/OnRampPaymentSteps/useCreateAndTransferFundsToMasterSafeSteps',
  () => ({
    useCreateAndTransferFundsToMasterSafeSteps: (...args: unknown[]) =>
      mockUseCreateAndTransferFundsToMasterSafeSteps(...args),
  }),
);

// Mock UI components
jest.mock('../../../../components/ui/TransactionSteps', () => ({
  TransactionSteps: ({
    steps,
  }: {
    steps: Array<{ title: string; status: string }>;
  }) =>
    createElement(
      'div',
      { 'data-testid': 'steps' },
      JSON.stringify(steps.map((s) => s.title)),
    ),
}));

jest.mock('../../../../components/ui/AgentSetupCompleteModal', () => ({
  AgentSetupCompleteModal: () =>
    createElement('div', { 'data-testid': 'setup-complete-modal' }),
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-var-requires */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {
  OnRampPaymentSteps,
} = require('../../../../components/OnRamp/OnRampPaymentSteps/OnRampPaymentSteps');
/* eslint-enable @typescript-eslint/no-var-requires */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultOnRampContext = {
  isOnRampingStepCompleted: false,
  isSwappingFundsStepCompleted: false,
};

const buyCryptoStep = { title: 'Buy', status: 'wait' as const };
const swapStep = { title: 'Swap', status: 'wait' as const };
const createSafeStep = { title: 'Create Safe', status: 'wait' as const };
const transferStep = { title: 'Transfer Funds', status: 'wait' as const };

const mockGetOnRampRequirementsParams: GetOnRampRequirementsParams = jest.fn(
  () => null,
);

const defaultProps = {
  mode: 'onboard' as const,
  onRampChainId: EvmChainIdMap.Base,
  getOnRampRequirementsParams: mockGetOnRampRequirementsParams,
};

const setupMocks = (overrides?: {
  onRampContext?: Partial<typeof defaultOnRampContext>;
  swapFundsStep?: {
    tokensToBeTransferred?: string[];
    tokensToBeBridged?: string[];
    step?: { title: string; status: string };
  };
  createAndTransferSteps?: {
    isMasterSafeCreatedAndFundsTransferred?: boolean;
    steps?: Array<{ title: string; status: string }>;
  };
}) => {
  mockUseOnRampContext.mockReturnValue({
    ...defaultOnRampContext,
    ...overrides?.onRampContext,
  });
  mockUseBuyCryptoStep.mockReturnValue(buyCryptoStep);
  mockUseSwapFundsStep.mockReturnValue({
    tokensToBeTransferred: [],
    tokensToBeBridged: [],
    step: swapStep,
    ...overrides?.swapFundsStep,
  });
  mockUseCreateAndTransferFundsToMasterSafeSteps.mockReturnValue({
    isMasterSafeCreatedAndFundsTransferred: false,
    steps: [],
    ...overrides?.createAndTransferSteps,
  });
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('OnRampPaymentSteps', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  describe('step composition', () => {
    it('always includes buyCryptoStep', () => {
      const { getByTestId } = render(
        createElement(OnRampPaymentSteps, defaultProps),
      );
      const stepsContent = getByTestId('steps').textContent;
      expect(stepsContent).toContain('Buy');
    });

    it('includes swapStep when tokensToBeBridged has items', () => {
      setupMocks({
        swapFundsStep: {
          tokensToBeBridged: ['USDC'],
        },
      });
      const { getByTestId } = render(
        createElement(OnRampPaymentSteps, defaultProps),
      );
      const stepsContent = getByTestId('steps').textContent;
      expect(stepsContent).toContain('Buy');
      expect(stepsContent).toContain('Swap');
    });

    it('does NOT include swapStep when tokensToBeBridged is empty', () => {
      setupMocks({
        swapFundsStep: {
          tokensToBeBridged: [],
        },
      });
      const { getByTestId } = render(
        createElement(OnRampPaymentSteps, defaultProps),
      );
      const stepsContent = getByTestId('steps').textContent;
      expect(stepsContent).toContain('Buy');
      expect(stepsContent).not.toContain('Swap');
    });

    it('includes createAndTransferFundsToMasterSafeSteps when provided', () => {
      setupMocks({
        createAndTransferSteps: {
          steps: [createSafeStep, transferStep],
        },
      });
      const { getByTestId } = render(
        createElement(OnRampPaymentSteps, defaultProps),
      );
      const stepsContent = getByTestId('steps').textContent;
      expect(stepsContent).toContain('Buy');
      expect(stepsContent).toContain('Create Safe');
      expect(stepsContent).toContain('Transfer Funds');
    });
  });

  describe('completion detection - deposit mode', () => {
    const depositProps = {
      ...defaultProps,
      mode: 'deposit' as const,
      onOnRampCompleted: jest.fn(),
    };

    it('calls onOnRampCompleted when all conditions met in deposit mode', () => {
      setupMocks({
        onRampContext: {
          isOnRampingStepCompleted: true,
          isSwappingFundsStepCompleted: true,
        },
      });
      render(createElement(OnRampPaymentSteps, depositProps));
      expect(depositProps.onOnRampCompleted).toHaveBeenCalledTimes(1);
    });

    it('does NOT call onOnRampCompleted when isOnRampingStepCompleted is false', () => {
      setupMocks({
        onRampContext: {
          isOnRampingStepCompleted: false,
        },
      });
      render(createElement(OnRampPaymentSteps, depositProps));
      expect(depositProps.onOnRampCompleted).not.toHaveBeenCalled();
    });

    it('does NOT call onOnRampCompleted when tokensToBeBridged > 0 and swapping not completed', () => {
      setupMocks({
        onRampContext: {
          isOnRampingStepCompleted: true,
          isSwappingFundsStepCompleted: false,
        },
        swapFundsStep: {
          tokensToBeBridged: ['USDC'],
        },
      });
      render(createElement(OnRampPaymentSteps, depositProps));
      expect(depositProps.onOnRampCompleted).not.toHaveBeenCalled();
    });

    it('does NOT call onOnRampCompleted when createAndTransferSteps.length > 0 and funds not transferred', () => {
      setupMocks({
        onRampContext: {
          isOnRampingStepCompleted: true,
          isSwappingFundsStepCompleted: true,
        },
        createAndTransferSteps: {
          isMasterSafeCreatedAndFundsTransferred: false,
          steps: [createSafeStep],
        },
      });
      render(createElement(OnRampPaymentSteps, depositProps));
      expect(depositProps.onOnRampCompleted).not.toHaveBeenCalled();
    });

    it('does NOT call onOnRampCompleted when onOnRampCompleted is undefined', () => {
      setupMocks({
        onRampContext: {
          isOnRampingStepCompleted: true,
          isSwappingFundsStepCompleted: true,
        },
      });
      const propsWithoutCallback = {
        ...defaultProps,
        mode: 'deposit' as const,
      };
      // Should not throw and should not call anything
      expect(() => {
        render(createElement(OnRampPaymentSteps, propsWithoutCallback));
      }).not.toThrow();
    });

    it('does NOT show AgentSetupCompleteModal in deposit mode', () => {
      setupMocks({
        onRampContext: {
          isOnRampingStepCompleted: true,
          isSwappingFundsStepCompleted: true,
        },
      });
      const { queryByTestId } = render(
        createElement(OnRampPaymentSteps, depositProps),
      );
      expect(queryByTestId('setup-complete-modal')).toBeNull();
    });

    it('calls onOnRampCompleted when tokensToBeBridged > 0 and swapping IS completed', () => {
      setupMocks({
        onRampContext: {
          isOnRampingStepCompleted: true,
          isSwappingFundsStepCompleted: true,
        },
        swapFundsStep: {
          tokensToBeBridged: ['USDC'],
        },
      });
      render(createElement(OnRampPaymentSteps, depositProps));
      expect(depositProps.onOnRampCompleted).toHaveBeenCalledTimes(1);
    });

    it('calls onOnRampCompleted when createAndTransferSteps > 0 and funds ARE transferred', () => {
      setupMocks({
        onRampContext: {
          isOnRampingStepCompleted: true,
          isSwappingFundsStepCompleted: true,
        },
        createAndTransferSteps: {
          isMasterSafeCreatedAndFundsTransferred: true,
          steps: [createSafeStep],
        },
      });
      render(createElement(OnRampPaymentSteps, depositProps));
      expect(depositProps.onOnRampCompleted).toHaveBeenCalledTimes(1);
    });
  });

  describe('completion detection - onboard mode', () => {
    it('shows AgentSetupCompleteModal when all conditions met in onboard mode', () => {
      setupMocks({
        onRampContext: {
          isOnRampingStepCompleted: true,
          isSwappingFundsStepCompleted: true,
        },
      });
      const { queryByTestId } = render(
        createElement(OnRampPaymentSteps, {
          ...defaultProps,
          mode: 'onboard',
        }),
      );
      expect(queryByTestId('setup-complete-modal')).not.toBeNull();
    });

    it('does NOT show modal when isOnRampingStepCompleted is false', () => {
      setupMocks({
        onRampContext: {
          isOnRampingStepCompleted: false,
        },
      });
      const { queryByTestId } = render(
        createElement(OnRampPaymentSteps, {
          ...defaultProps,
          mode: 'onboard',
        }),
      );
      expect(queryByTestId('setup-complete-modal')).toBeNull();
    });

    it('does NOT call onOnRampCompleted in onboard mode even when provided', () => {
      const onOnRampCompleted = jest.fn();
      setupMocks({
        onRampContext: {
          isOnRampingStepCompleted: true,
          isSwappingFundsStepCompleted: true,
        },
      });
      const { queryByTestId } = render(
        createElement(OnRampPaymentSteps, {
          ...defaultProps,
          mode: 'onboard',
          onOnRampCompleted,
        }),
      );
      // In onboard mode, it sets isSetupCompleted instead of calling onOnRampCompleted
      expect(onOnRampCompleted).not.toHaveBeenCalled();
      expect(queryByTestId('setup-complete-modal')).not.toBeNull();
    });

    it('does NOT show modal when tokensToBeBridged > 0 and swapping not completed', () => {
      setupMocks({
        onRampContext: {
          isOnRampingStepCompleted: true,
          isSwappingFundsStepCompleted: false,
        },
        swapFundsStep: {
          tokensToBeBridged: ['USDC'],
        },
      });
      const { queryByTestId } = render(
        createElement(OnRampPaymentSteps, {
          ...defaultProps,
          mode: 'onboard',
        }),
      );
      expect(queryByTestId('setup-complete-modal')).toBeNull();
    });

    it('does NOT show modal when createAndTransferSteps > 0 and funds not transferred', () => {
      setupMocks({
        onRampContext: {
          isOnRampingStepCompleted: true,
          isSwappingFundsStepCompleted: true,
        },
        createAndTransferSteps: {
          isMasterSafeCreatedAndFundsTransferred: false,
          steps: [createSafeStep],
        },
      });
      const { queryByTestId } = render(
        createElement(OnRampPaymentSteps, {
          ...defaultProps,
          mode: 'onboard',
        }),
      );
      expect(queryByTestId('setup-complete-modal')).toBeNull();
    });

    it('shows modal when conditions change to met via rerender', () => {
      setupMocks({
        onRampContext: {
          isOnRampingStepCompleted: false,
        },
      });
      const { queryByTestId, rerender } = render(
        createElement(OnRampPaymentSteps, {
          ...defaultProps,
          mode: 'onboard',
        }),
      );
      expect(queryByTestId('setup-complete-modal')).toBeNull();

      // Update mocks and rerender
      setupMocks({
        onRampContext: {
          isOnRampingStepCompleted: true,
          isSwappingFundsStepCompleted: true,
        },
      });
      act(() => {
        rerender(
          createElement(OnRampPaymentSteps, {
            ...defaultProps,
            mode: 'onboard',
          }),
        );
      });
      expect(queryByTestId('setup-complete-modal')).not.toBeNull();
    });
  });
});
