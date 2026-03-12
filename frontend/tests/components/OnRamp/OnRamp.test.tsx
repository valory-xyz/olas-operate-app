import { fireEvent, render } from '@testing-library/react';
import { createElement } from 'react';

import { EvmChainIdMap } from '../../../constants/chains';

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

const mockUseOnRampContext = jest.fn();
jest.mock('../../../hooks/useOnRampContext', () => ({
  useOnRampContext: (...args: unknown[]) => mockUseOnRampContext(...args),
}));
// Also mock the hooks barrel since OnRamp.tsx imports from '@/hooks'
/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock('../../../hooks', () => ({
  __esModule: true,
  useOnRampContext: (...args: unknown[]) =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('../../../hooks/useOnRampContext').useOnRampContext(...args),
}));
/* eslint-enable @typescript-eslint/no-var-requires */

let payingReceivingTableProps: Record<string, unknown> = {};
let onRampPaymentStepsProps: Record<string, unknown> = {};

jest.mock(
  '../../../components/OnRamp/PayingReceivingTable/PayingReceivingTable',
  () => ({
    PayingReceivingTable: (props: Record<string, unknown>) => {
      payingReceivingTableProps = props;
      return createElement('div', { 'data-testid': 'paying-receiving-table' });
    },
  }),
);

jest.mock(
  '../../../components/OnRamp/OnRampPaymentSteps/OnRampPaymentSteps',
  () => ({
    OnRampPaymentSteps: (props: Record<string, unknown>) => {
      onRampPaymentStepsProps = props;
      return createElement('div', { 'data-testid': 'payment-steps' });
    },
  }),
);

jest.mock('../../../components/ui', () => ({
  Alert: ({ message }: { message: string }) =>
    createElement('div', { 'data-testid': 'alert' }, message),
  BackButton: ({ onPrev }: { onPrev: () => void }) =>
    createElement('button', { 'data-testid': 'back-button', onClick: onPrev }),
  CardFlex: ({ children }: { children: React.ReactNode }) =>
    createElement('div', null, children),
}));

jest.mock('antd', () => ({
  Button: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => createElement('button', { onClick }, children),
  Flex: ({ children }: { children: React.ReactNode }) =>
    createElement('div', null, children),
  Modal: ({
    children,
    title,
    footer,
    open,
  }: {
    children: React.ReactNode;
    title: string;
    footer: React.ReactNode[];
    open: boolean;
    onCancel: () => void;
  }) =>
    open
      ? createElement(
          'div',
          { 'data-testid': 'modal' },
          createElement('h2', null, title),
          children,
          createElement('div', { 'data-testid': 'modal-footer' }, ...footer),
        )
      : null,
  Spin: () => createElement('div', { 'data-testid': 'spinner' }),
  Typography: {
    Text: ({ children }: { children: React.ReactNode }) =>
      createElement('span', null, children),
    Title: ({ children }: { children: React.ReactNode }) =>
      createElement('h1', null, children),
  },
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-var-requires */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { OnRamp } = require('../../../components/OnRamp/OnRamp');
/* eslint-enable @typescript-eslint/no-var-requires */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockResetOnRampState = jest.fn();
const mockHandleBack = jest.fn();
const mockGetOnRampRequirementsParams = jest.fn().mockReturnValue(null);
const mockOnOnRampCompleted = jest.fn();

const setupMocks = (
  overrides: {
    networkId?: number | null;
  } = {},
) => {
  mockUseOnRampContext.mockReturnValue({
    networkId:
      'networkId' in overrides ? overrides.networkId : EvmChainIdMap.Base,
    resetOnRampState: mockResetOnRampState,
  });
};

const defaultProps = {
  mode: 'deposit' as const,
  getOnRampRequirementsParams: mockGetOnRampRequirementsParams,
  handleBack: mockHandleBack,
  onOnRampCompleted: mockOnOnRampCompleted,
};

const renderOnRamp = (overrides: Record<string, unknown> = {}) =>
  render(createElement(OnRamp, { ...defaultProps, ...overrides }));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('OnRamp', () => {
  beforeEach(() => {
    mockHandleBack.mockClear();
    mockResetOnRampState.mockClear();
    mockGetOnRampRequirementsParams.mockClear();
    mockOnOnRampCompleted.mockClear();
    payingReceivingTableProps = {};
    onRampPaymentStepsProps = {};
  });

  describe('when networkId is available', () => {
    it('renders PayingReceivingTable and OnRampPaymentSteps', () => {
      setupMocks();
      const { getByTestId, queryByTestId } = renderOnRamp();
      expect(getByTestId('paying-receiving-table')).toBeTruthy();
      expect(getByTestId('payment-steps')).toBeTruthy();
      expect(queryByTestId('spinner')).toBeNull();
    });

    it('passes onRampChainId to PayingReceivingTable', () => {
      setupMocks();
      renderOnRamp();
      expect(payingReceivingTableProps.onRampChainId).toBe(EvmChainIdMap.Base);
    });

    it('passes mode to PayingReceivingTable', () => {
      setupMocks();
      renderOnRamp({ mode: 'onboard' });
      expect(payingReceivingTableProps.mode).toBe('onboard');
    });

    it('passes getOnRampRequirementsParams to PayingReceivingTable', () => {
      setupMocks();
      renderOnRamp();
      expect(payingReceivingTableProps.getOnRampRequirementsParams).toBe(
        mockGetOnRampRequirementsParams,
      );
    });

    it('passes props to OnRampPaymentSteps', () => {
      setupMocks();
      renderOnRamp();
      expect(onRampPaymentStepsProps.mode).toBe('deposit');
      expect(onRampPaymentStepsProps.onRampChainId).toBe(EvmChainIdMap.Base);
      expect(onRampPaymentStepsProps.onOnRampCompleted).toBe(
        mockOnOnRampCompleted,
      );
    });
  });

  describe('when networkId is null', () => {
    it('does not render main content when networkId is null', () => {
      setupMocks({ networkId: null });
      const { queryByTestId } = renderOnRamp();
      expect(queryByTestId('paying-receiving-table')).toBeNull();
      expect(queryByTestId('payment-steps')).toBeNull();
    });
  });

  describe('back navigation modal (OnBack)', () => {
    it('opens modal when back button is clicked', () => {
      setupMocks();
      const { getByTestId } = renderOnRamp();
      fireEvent.click(getByTestId('back-button'));
      expect(getByTestId('modal')).toBeTruthy();
    });

    it('calls resetOnRampState and handleBack when "Leave page" is clicked', () => {
      setupMocks();
      const { getByTestId, getByText } = renderOnRamp();

      fireEvent.click(getByTestId('back-button'));
      fireEvent.click(getByText('Leave page'));

      expect(mockResetOnRampState).toHaveBeenCalledTimes(1);
      expect(mockHandleBack).toHaveBeenCalledTimes(1);
    });

    it('closes modal when "Stay on this page" is clicked', () => {
      setupMocks();
      const { getByTestId, getByText, queryByTestId } = renderOnRamp();

      fireEvent.click(getByTestId('back-button'));
      expect(getByTestId('modal')).toBeTruthy();

      fireEvent.click(getByText('Stay on this page'));
      expect(queryByTestId('modal')).toBeNull();
    });

    it('does not call handleBack when modal is dismissed via stay', () => {
      setupMocks();
      const { getByTestId, getByText } = renderOnRamp();

      fireEvent.click(getByTestId('back-button'));
      fireEvent.click(getByText('Stay on this page'));

      expect(mockHandleBack).not.toHaveBeenCalled();
      expect(mockResetOnRampState).not.toHaveBeenCalled();
    });
  });
});
