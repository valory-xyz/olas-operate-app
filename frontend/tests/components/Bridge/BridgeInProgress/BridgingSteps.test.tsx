import { render } from '@testing-library/react';
import { createElement } from 'react';

import { TokenSymbolMap } from '../../../../config/tokens';
import { BridgingStepStatus } from '../../../../types/Bridge';

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

// Mock UI components
jest.mock('../../../../components/ui', () => ({
  FundsAreSafeMessage: ({
    showRestartMessage,
  }: {
    showRestartMessage?: boolean;
  }) =>
    createElement(
      'div',
      { 'data-testid': 'funds-safe-message' },
      showRestartMessage ? 'restart' : 'safe',
    ),
  LoadingSpinner: () => createElement('div', { 'data-testid': 'spinner' }),
  Steps: ({
    items,
  }: {
    items: Array<{
      status: string;
      title: string;
      description: React.ReactNode;
      icon?: React.ReactNode;
    }>;
  }) =>
    createElement(
      'div',
      { 'data-testid': 'steps' },
      items.map((item, i) =>
        createElement(
          'div',
          { key: i, 'data-testid': `step-${i}`, 'data-status': item.status },
          createElement(
            'span',
            { 'data-testid': `step-title-${i}` },
            item.title,
          ),
          createElement(
            'div',
            { 'data-testid': `step-desc-${i}` },
            item.description,
          ),
          item.icon
            ? createElement(
                'span',
                { 'data-testid': `step-icon-${i}` },
                item.icon,
              )
            : null,
        ),
      ),
    ),
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-var-requires */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {
  BridgingSteps,
} = require('../../../../components/Bridge/BridgeInProgress/BridgingSteps');
/* eslint-enable @typescript-eslint/no-var-requires */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type StepEvent = {
  symbol?: string;
  status?: BridgingStepStatus;
  txnLink?: string;
  onRetry?: () => void;
  onRetryProps?: { isLoading: boolean };
};

type BridgingStep = {
  status: BridgingStepStatus;
  subSteps: StepEvent[];
};

const renderBridgingSteps = (props: {
  chainName: string;
  bridge: BridgingStep;
  masterSafeCreation?: BridgingStep;
  masterSafeTransfer?: BridgingStep;
}) => render(createElement(BridgingSteps, props));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BridgingSteps', () => {
  describe('bridge step rendering', () => {
    it('renders bridge step with chain display name in title', () => {
      const { getByTestId } = renderBridgingSteps({
        chainName: 'gnosis',
        bridge: { status: 'process', subSteps: [] },
      });

      expect(getByTestId('step-title-0').textContent).toBe(
        'Bridge funds to Gnosis',
      );
    });

    it('renders bridge step with correct status', () => {
      const { getByTestId } = renderBridgingSteps({
        chainName: 'gnosis',
        bridge: { status: 'finish', subSteps: [] },
      });

      expect(getByTestId('step-0').getAttribute('data-status')).toBe('finish');
    });
  });

  describe('bridge step sub-steps (generateBridgeStep logic)', () => {
    it('generates "transaction complete" description for finish status', () => {
      const { getByTestId } = renderBridgingSteps({
        chainName: 'gnosis',
        bridge: {
          status: 'finish',
          subSteps: [{ symbol: TokenSymbolMap.ETH, status: 'finish' }],
        },
      });

      expect(getByTestId('step-desc-0').textContent).toContain(
        'Bridging ETH transaction complete.',
      );
    });

    it('generates "failed" description for error status', () => {
      const { getByTestId } = renderBridgingSteps({
        chainName: 'gnosis',
        bridge: {
          status: 'error',
          subSteps: [{ symbol: TokenSymbolMap.OLAS, status: 'error' }],
        },
      });

      expect(getByTestId('step-desc-0').textContent).toContain(
        'Bridging OLAS failed.',
      );
    });

    it('generates "Sending transaction..." for other statuses', () => {
      const { getByTestId } = renderBridgingSteps({
        chainName: 'gnosis',
        bridge: {
          status: 'process',
          subSteps: [{ symbol: TokenSymbolMap.ETH, status: 'process' }],
        },
      });

      expect(getByTestId('step-desc-0').textContent).toContain(
        'Sending transaction...',
      );
    });

    it('handles empty symbol in description', () => {
      const { getByTestId } = renderBridgingSteps({
        chainName: 'gnosis',
        bridge: {
          status: 'finish',
          subSteps: [{ status: 'finish' }],
        },
      });

      expect(getByTestId('step-desc-0').textContent).toContain(
        'Bridging  transaction complete.',
      );
    });

    it('renders FundsAreSafeMessage for error sub-steps', () => {
      const { queryAllByTestId } = renderBridgingSteps({
        chainName: 'gnosis',
        bridge: {
          status: 'error',
          subSteps: [{ symbol: TokenSymbolMap.ETH, status: 'error' }],
        },
      });

      expect(queryAllByTestId('funds-safe-message')).toHaveLength(1);
    });

    it('does not render FundsAreSafeMessage for non-error sub-steps', () => {
      const { queryAllByTestId } = renderBridgingSteps({
        chainName: 'gnosis',
        bridge: {
          status: 'finish',
          subSteps: [{ symbol: TokenSymbolMap.ETH, status: 'finish' }],
        },
      });

      expect(queryAllByTestId('funds-safe-message')).toHaveLength(0);
    });

    it('renders multiple bridge sub-steps', () => {
      const { getByTestId } = renderBridgingSteps({
        chainName: 'gnosis',
        bridge: {
          status: 'process',
          subSteps: [
            { symbol: TokenSymbolMap.ETH, status: 'finish' },
            { symbol: TokenSymbolMap.OLAS, status: 'process' },
          ],
        },
      });

      const desc = getByTestId('step-desc-0').textContent;
      expect(desc).toContain('Bridging ETH transaction complete.');
      expect(desc).toContain('Sending transaction...');
    });
  });

  describe('master safe creation step (generateMasterSafeCreationStep)', () => {
    it('renders when masterSafeCreation is provided', () => {
      const { getByTestId } = renderBridgingSteps({
        chainName: 'gnosis',
        bridge: { status: 'finish', subSteps: [] },
        masterSafeCreation: { status: 'process', subSteps: [{}] },
      });

      expect(getByTestId('step-title-1').textContent).toBe(
        'Create Pearl Wallet',
      );
    });

    it('does not render when masterSafeCreation is undefined', () => {
      const { queryByTestId } = renderBridgingSteps({
        chainName: 'gnosis',
        bridge: { status: 'finish', subSteps: [] },
      });

      expect(queryByTestId('step-1')).toBeNull();
    });

    it('shows "Transaction complete." for finish status', () => {
      const { getByTestId } = renderBridgingSteps({
        chainName: 'gnosis',
        bridge: { status: 'finish', subSteps: [] },
        masterSafeCreation: { status: 'finish', subSteps: [{}] },
      });

      expect(getByTestId('step-desc-1').textContent).toContain(
        'Transaction complete.',
      );
    });

    it('shows "Transaction failed." for error status', () => {
      const { getByTestId } = renderBridgingSteps({
        chainName: 'gnosis',
        bridge: { status: 'finish', subSteps: [] },
        masterSafeCreation: { status: 'error', subSteps: [{}] },
      });

      expect(getByTestId('step-desc-1').textContent).toContain(
        'Transaction failed.',
      );
    });

    it('shows "Sending transaction..." for process status', () => {
      const { getByTestId } = renderBridgingSteps({
        chainName: 'gnosis',
        bridge: { status: 'finish', subSteps: [] },
        masterSafeCreation: { status: 'process', subSteps: [{}] },
      });

      expect(getByTestId('step-desc-1').textContent).toContain(
        'Sending transaction...',
      );
    });

    it('shows null description for wait status', () => {
      const { getByTestId } = renderBridgingSteps({
        chainName: 'gnosis',
        bridge: { status: 'finish', subSteps: [] },
        masterSafeCreation: { status: 'wait', subSteps: [{}] },
      });

      // Description is null for wait — only the FundsAreSafeMessage or txnLink may render
      const desc = getByTestId('step-desc-1').textContent;
      expect(desc).not.toContain('Transaction complete.');
      expect(desc).not.toContain('Sending transaction...');
    });
  });

  describe('master safe transfer step (generateMasterSafeTransferStep)', () => {
    it('renders when masterSafeTransfer is provided', () => {
      const { getByTestId } = renderBridgingSteps({
        chainName: 'gnosis',
        bridge: { status: 'finish', subSteps: [] },
        masterSafeCreation: { status: 'finish', subSteps: [{}] },
        masterSafeTransfer: {
          status: 'process',
          subSteps: [{ symbol: TokenSymbolMap.ETH, status: 'process' }],
        },
      });

      expect(getByTestId('step-title-2').textContent).toBe(
        'Transfer funds to the Pearl Wallet',
      );
    });

    it('shows "Transfer ETH transaction complete." for finish', () => {
      const { getByTestId } = renderBridgingSteps({
        chainName: 'gnosis',
        bridge: { status: 'finish', subSteps: [] },
        masterSafeCreation: { status: 'finish', subSteps: [{}] },
        masterSafeTransfer: {
          status: 'finish',
          subSteps: [{ symbol: TokenSymbolMap.ETH, status: 'finish' }],
        },
      });

      expect(getByTestId('step-desc-2').textContent).toContain(
        'Transfer ETH transaction complete.',
      );
    });

    it('shows "Transfer OLAS transaction failed." for error', () => {
      const { getByTestId } = renderBridgingSteps({
        chainName: 'gnosis',
        bridge: { status: 'finish', subSteps: [] },
        masterSafeCreation: { status: 'finish', subSteps: [{}] },
        masterSafeTransfer: {
          status: 'error',
          subSteps: [{ symbol: TokenSymbolMap.OLAS, status: 'error' }],
        },
      });

      expect(getByTestId('step-desc-2').textContent).toContain(
        'Transfer OLAS transaction failed.',
      );
    });

    it('shows "Sending transaction..." for process', () => {
      const { getByTestId } = renderBridgingSteps({
        chainName: 'gnosis',
        bridge: { status: 'finish', subSteps: [] },
        masterSafeCreation: { status: 'finish', subSteps: [{}] },
        masterSafeTransfer: {
          status: 'process',
          subSteps: [{ symbol: TokenSymbolMap.ETH, status: 'process' }],
        },
      });

      expect(getByTestId('step-desc-2').textContent).toContain(
        'Sending transaction...',
      );
    });

    it('shows null description for wait status', () => {
      const { getByTestId } = renderBridgingSteps({
        chainName: 'gnosis',
        bridge: { status: 'finish', subSteps: [] },
        masterSafeCreation: { status: 'finish', subSteps: [{}] },
        masterSafeTransfer: {
          status: 'wait',
          subSteps: [{ symbol: TokenSymbolMap.ETH, status: 'wait' }],
        },
      });

      const desc = getByTestId('step-desc-2').textContent;
      expect(desc).not.toContain('Transfer');
      expect(desc).not.toContain('Sending');
    });
  });

  describe('step count', () => {
    it('renders 1 step when only bridge is provided', () => {
      const { queryAllByTestId } = renderBridgingSteps({
        chainName: 'gnosis',
        bridge: { status: 'process', subSteps: [] },
      });

      const steps = queryAllByTestId(/^step-\d+$/);
      expect(steps).toHaveLength(1);
    });

    it('renders 2 steps when bridge + masterSafeCreation are provided', () => {
      const { queryAllByTestId } = renderBridgingSteps({
        chainName: 'gnosis',
        bridge: { status: 'finish', subSteps: [] },
        masterSafeCreation: { status: 'process', subSteps: [{}] },
      });

      const steps = queryAllByTestId(/^step-\d+$/);
      expect(steps).toHaveLength(2);
    });

    it('renders 3 steps when all steps are provided', () => {
      const { queryAllByTestId } = renderBridgingSteps({
        chainName: 'gnosis',
        bridge: { status: 'finish', subSteps: [] },
        masterSafeCreation: { status: 'finish', subSteps: [{}] },
        masterSafeTransfer: { status: 'process', subSteps: [] },
      });

      const steps = queryAllByTestId(/^step-\d+$/);
      expect(steps).toHaveLength(3);
    });
  });

  describe('loading spinner', () => {
    it('renders spinner icon for process status steps', () => {
      const { queryAllByTestId } = renderBridgingSteps({
        chainName: 'gnosis',
        bridge: { status: 'process', subSteps: [] },
      });

      expect(queryAllByTestId('spinner')).toHaveLength(1);
    });

    it('does not render spinner for non-process status', () => {
      const { queryAllByTestId } = renderBridgingSteps({
        chainName: 'gnosis',
        bridge: { status: 'finish', subSteps: [] },
      });

      expect(queryAllByTestId('spinner')).toHaveLength(0);
    });
  });
});
