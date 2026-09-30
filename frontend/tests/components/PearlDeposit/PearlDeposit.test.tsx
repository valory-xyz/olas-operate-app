import { act, render, screen } from '@testing-library/react';
import { createElement } from 'react';

import { FundingFlowProps } from '../../../components/FundingFlow';
import { PearlDeposit } from '../../../components/PearlDeposit';
import { EvmChainIdMap } from '../../../constants/chains';
import { FundingRun } from '../../../types/FundingRun';
import { makeFundingRun } from '../../helpers/factories';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../../constants/providers', () => ({ PROVIDERS: {} }));
jest.mock('../../../config/providers', () => ({ providers: [] }));

let depositProps: { onBack: () => void; onContinue: () => void };
let flowProps: FundingFlowProps | null = null;
let mockActiveRun: FundingRun | null = null;
const mockGotoPearlWallet = jest.fn();

jest.mock('../../../components/PearlDeposit/Deposit/Deposit', () => ({
  Deposit: (props: typeof depositProps) => {
    depositProps = props;
    return createElement('div', { 'data-testid': 'deposit' });
  },
}));

jest.mock('../../../components/FundingFlow', () => ({
  FundingFlow: (props: FundingFlowProps) => {
    flowProps = props;
    return createElement('div', { 'data-testid': 'funding-flow' });
  },
}));

jest.mock('../../../hooks', () => ({
  useFundingRun: () => ({ activeRun: mockActiveRun }),
}));

jest.mock('../../../context/PearlWalletProvider', () => ({
  usePearlWallet: () => ({
    walletChainId: EvmChainIdMap.Polygon,
    // Targets: hold 100 OLAS and 5 POL.
    amountsToDeposit: { OLAS: { amount: 100 }, POL: { amount: 5 } },
    availableAssets: [
      { symbol: 'OLAS', amount: 40 },
      { symbol: 'POL', amount: 7 },
    ],
    gotoPearlWallet: mockGotoPearlWallet,
  }),
}));

const mockOnBack = jest.fn();

describe('PearlDeposit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    flowProps = null;
    mockActiveRun = null;
  });

  it('starts on the amounts step', () => {
    render(<PearlDeposit onBack={mockOnBack} />);
    expect(screen.getByTestId('deposit')).toBeInTheDocument();
    expect(depositProps.onBack).toBe(mockOnBack);
  });

  it('opens the funding flow on Continue, never the payment-method picker', () => {
    render(<PearlDeposit onBack={mockOnBack} />);
    act(() => depositProps.onContinue());

    expect(screen.getByTestId('funding-flow')).toBeInTheDocument();
    expect(screen.queryByText(/Buy|Bridge|Transfer/)).toBeNull();
  });

  it('sends the entered amounts as base-unit target balances by token address', () => {
    render(<PearlDeposit onBack={mockOnBack} />);
    act(() => depositProps.onContinue());

    expect(flowProps).toMatchObject({
      mode: 'deposit',
      destinationChain: 'polygon',
      depositAmounts: {
        '0xFEF5d947472e72Efbb2E388c730B7428406F2F95': '100000000000000000000',
        '0x0000000000000000000000000000000000000000': '5000000000000000000',
      },
    });
  });

  it('shows target minus balance as "To receive" before a run exists', () => {
    render(<PearlDeposit onBack={mockOnBack} />);
    act(() => depositProps.onContinue());

    expect(flowProps?.fallbackToReceive).toEqual([
      { symbol: 'OLAS', amount: 60 },
    ]);
  });

  it('goes back to the amounts step, and to the wallet on completion', () => {
    render(<PearlDeposit onBack={mockOnBack} />);
    act(() => depositProps.onContinue());

    act(() => flowProps?.onBack());
    expect(screen.getByTestId('deposit')).toBeInTheDocument();

    act(() => depositProps.onContinue());
    flowProps?.onTransferCompleted?.();
    expect(mockGotoPearlWallet).toHaveBeenCalled();
  });

  it('opens straight into a live run instead of a new deposit', () => {
    mockActiveRun = makeFundingRun({ mode: 'deposit', status: 'PROCESSING' });
    render(<PearlDeposit onBack={mockOnBack} />);

    expect(screen.getByTestId('funding-flow')).toBeInTheDocument();
    act(() => flowProps?.onBack());
    expect(mockOnBack).toHaveBeenCalled();
  });

  it('ignores a completed run', () => {
    mockActiveRun = makeFundingRun({ mode: 'deposit', status: 'COMPLETED' });
    render(<PearlDeposit onBack={mockOnBack} />);

    expect(screen.getByTestId('deposit')).toBeInTheDocument();
  });
});
