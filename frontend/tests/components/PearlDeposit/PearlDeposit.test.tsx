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
const DEFAULT_AMOUNTS = { OLAS: { amount: 100 }, POL: { amount: 5 } };
let mockAmountsToDeposit: Record<string, { amount: number }> = DEFAULT_AMOUNTS;
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
    amountsToDeposit: mockAmountsToDeposit,
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
    mockAmountsToDeposit = DEFAULT_AMOUNTS;
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

  it('sends the entered amounts in base units by token address', () => {
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

  it('sends decimal amounts exactly, without float noise', () => {
    mockAmountsToDeposit = {
      OLAS: { amount: 0.1 },
      POL: { amount: 1234.5678 },
    };
    render(<PearlDeposit onBack={mockOnBack} />);
    act(() => depositProps.onContinue());

    expect(flowProps?.mode === 'deposit' && flowProps.depositAmounts).toEqual({
      '0xFEF5d947472e72Efbb2E388c730B7428406F2F95': '100000000000000000',
      '0x0000000000000000000000000000000000000000': '1234567800000000000000',
    });
  });

  it('shows the entered amounts, not net of the balance, as "To receive" before a run exists', () => {
    render(<PearlDeposit onBack={mockOnBack} />);
    act(() => depositProps.onContinue());

    expect(flowProps?.fallbackToReceive).toEqual([
      { symbol: 'OLAS', amount: 100 },
      { symbol: 'POL', amount: 5 },
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

  it('starts a new deposit over a run that was only quoted', () => {
    mockActiveRun = makeFundingRun({ mode: 'deposit' });
    render(<PearlDeposit onBack={mockOnBack} />);

    expect(screen.getByTestId('deposit')).toBeInTheDocument();
  });

  it('resumes a run once part of its deposit has arrived', () => {
    mockActiveRun = makeFundingRun({
      mode: 'deposit',
      quote: { ...makeFundingRun().quote!, received_amount: '1' },
    });
    render(<PearlDeposit onBack={mockOnBack} />);

    expect(screen.getByTestId('funding-flow')).toBeInTheDocument();
  });

  it('keeps a resumed run on screen once it completes, so its success shows', () => {
    const live = makeFundingRun({ mode: 'deposit', status: 'PROCESSING' });
    mockActiveRun = live;
    const { rerender } = render(<PearlDeposit onBack={mockOnBack} />);
    expect(screen.getByTestId('funding-flow')).toBeInTheDocument();

    mockActiveRun = { ...live, status: 'COMPLETED' };
    rerender(<PearlDeposit onBack={mockOnBack} />);

    expect(screen.getByTestId('funding-flow')).toBeInTheDocument();
    expect(screen.queryByTestId('deposit')).toBeNull();
  });

  it('ignores a completed run', () => {
    mockActiveRun = makeFundingRun({ mode: 'deposit', status: 'COMPLETED' });
    render(<PearlDeposit onBack={mockOnBack} />);

    expect(screen.getByTestId('deposit')).toBeInTheDocument();
  });
});
