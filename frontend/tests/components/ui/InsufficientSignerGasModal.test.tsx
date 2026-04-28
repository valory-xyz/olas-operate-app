import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import {
  InsufficientSignerGasCase,
  InsufficientSignerGasModal,
} from '../../../components/ui/InsufficientSignerGasModal';
import { MiddlewareChainMap } from '../../../constants/chains';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../../constants/providers', () => ({}));

jest.mock('../../../components/ui/Modal', () => ({
  Modal: ({
    header,
    title,
    description,
    action,
    onCancel,
  }: {
    header: React.ReactNode;
    title: string;
    description: string;
    action: React.ReactNode;
    onCancel?: () => void;
  }) => (
    <div data-testid="modal">
      <div data-testid="modal-header">{header}</div>
      <div data-testid="modal-title">{title}</div>
      <div data-testid="modal-description">{description}</div>
      <div data-testid="modal-action">{action}</div>
      <button data-testid="modal-close" onClick={onCancel}>
        close
      </button>
    </div>
  ),
}));

jest.mock('../../../components/custom-icons', () => ({
  WarningOutlined: () => <span data-testid="warning-icon">warning</span>,
}));

const renderModal = (
  overrides: Partial<{
    caseType: InsufficientSignerGasCase;
    chain: string;
    prefillAmountWei: string;
    onFund: () => void;
    onClose: () => void;
  }> = {},
) => {
  const onFund = overrides.onFund ?? jest.fn();
  const onClose = overrides.onClose ?? jest.fn();
  const utils = render(
    <InsufficientSignerGasModal
      caseType={overrides.caseType ?? 'agent-withdraw'}
      chain={overrides.chain ?? MiddlewareChainMap.GNOSIS}
      prefillAmountWei={overrides.prefillAmountWei ?? '750000000000000000'}
      onFund={onFund}
      onClose={onClose}
    />,
  );
  return { ...utils, onFund, onClose };
};

describe('InsufficientSignerGasModal', () => {
  it('renders Case 1 (agent withdraw) copy with Gnosis XDAI prefill', () => {
    renderModal({ caseType: 'agent-withdraw' });
    expect(screen.getByTestId('modal-title')).toHaveTextContent(
      'Withdrawal Failed: Insufficient Balance',
    );
    expect(screen.getByTestId('modal-description')).toHaveTextContent(
      'Fund your agent wallet with at least 0.75 XDAI to cover gas fees.',
    );
    expect(
      screen.getByRole('button', { name: 'Fund Agent' }),
    ).toBeInTheDocument();
  });

  it('renders Case 2 (pearl withdraw) copy with Pearl Wallet CTA', () => {
    renderModal({
      caseType: 'pearl-withdraw',
      chain: MiddlewareChainMap.OPTIMISM,
      prefillAmountWei: '2500000000000000',
    });
    expect(screen.getByTestId('modal-title')).toHaveTextContent(
      'Withdrawal Failed: Insufficient Balance',
    );
    expect(screen.getByTestId('modal-description')).toHaveTextContent(
      'Fund your Pearl wallet with at least 0.0025 ETH to cover gas fees.',
    );
    expect(
      screen.getByRole('button', { name: 'Fund Pearl Wallet' }),
    ).toBeInTheDocument();
  });

  it('renders Case 3 (fund agent) copy with Transfer Failed title', () => {
    renderModal({
      caseType: 'fund-agent',
      chain: MiddlewareChainMap.POLYGON,
      prefillAmountWei: '8000000000000000000',
    });
    expect(screen.getByTestId('modal-title')).toHaveTextContent(
      'Transfer Failed: Insufficient Balance',
    );
    expect(screen.getByTestId('modal-description')).toHaveTextContent(
      'Fund your Pearl wallet with at least 8 POL to cover gas fees.',
    );
    expect(
      screen.getByRole('button', { name: 'Fund Agent' }),
    ).toBeInTheDocument();
  });

  it('accepts prefill_amount_wei as a string', () => {
    renderModal({
      caseType: 'agent-withdraw',
      prefillAmountWei: '750000000000000000',
    });
    expect(screen.getByTestId('modal-description')).toHaveTextContent(
      '0.75 XDAI',
    );
  });

  it('calls onFund when CTA clicked', () => {
    const { onFund } = renderModal({ caseType: 'agent-withdraw' });
    fireEvent.click(screen.getByRole('button', { name: 'Fund Agent' }));
    expect(onFund).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when modal dismissed', () => {
    const { onClose } = renderModal();
    fireEvent.click(screen.getByTestId('modal-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders the warning icon in the header', () => {
    renderModal();
    expect(screen.getByTestId('warning-icon')).toBeInTheDocument();
  });

  // NOTE: chain-validation is now performed by `useInsufficientGasModal` —
  // unsupported chains never reach this component. See
  // `tests/hooks/useInsufficientGasModal.test.ts` for that coverage.

  it('renders without crashing when prefillAmountWei is zero (malformed-response defensive case)', () => {
    renderModal({ prefillAmountWei: '0' });
    const description = screen.getByTestId('modal-description');
    expect(description).toHaveTextContent('at least 0 XDAI');
  });

  it('renders without crashing when prefillAmountWei is a very-small-magnitude value', () => {
    // 1 wei on Gnosis → rounds to 0 at 6dp precision; should still render.
    renderModal({ prefillAmountWei: '1' });
    expect(screen.getByTestId('modal-description')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Fund Agent' }),
    ).toBeInTheDocument();
  });
});
