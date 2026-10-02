import { render } from '@testing-library/react';
import { createElement } from 'react';

import { PearlWallet } from '../../../components/PearlWallet/PearlWallet';
import { STEPS } from '../../../components/PearlWallet/types';
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

const mockUpdateStep = jest.fn();
let mockActiveRun: FundingRun | null = null;
let mockWalletStep: string = 'PEARL_WALLET_SCREEN';

jest.mock('../../../context/PearlWalletProvider', () => ({
  usePearlWallet: () => ({
    walletStep: mockWalletStep,
    updateStep: mockUpdateStep,
  }),
}));

jest.mock('../../../hooks', () => ({
  useFundingRun: () => ({ activeRun: mockActiveRun }),
}));

jest.mock(
  '../../../components/PearlWallet/Withdraw/BalancesAndAssets/BalancesAndAssets',
  () => ({ BalancesAndAssets: () => createElement('div') }),
);
jest.mock('../../../components/PearlDeposit', () => ({
  PearlDeposit: () => createElement('div'),
}));

const fundedQuote = { ...makeFundingRun().quote!, received_amount: '1' };

beforeEach(() => {
  jest.clearAllMocks();
  mockActiveRun = null;
  mockWalletStep = STEPS.PEARL_WALLET_SCREEN;
});

describe('PearlWallet — funding run', () => {
  it('reopens the deposit step while a started deposit is in progress', () => {
    mockActiveRun = makeFundingRun({ mode: 'deposit', quote: fundedQuote });
    render(<PearlWallet />);

    expect(mockUpdateStep).toHaveBeenCalledWith(STEPS.DEPOSIT);
  });

  it('reopens it only once per visit, so Back from a failed run reaches the wallet', () => {
    const started = makeFundingRun({ mode: 'deposit', quote: fundedQuote });
    mockActiveRun = started;
    const { rerender } = render(<PearlWallet />);
    mockWalletStep = STEPS.DEPOSIT;
    rerender(<PearlWallet />);

    mockActiveRun = { ...started, status: 'FAILED' };
    mockWalletStep = STEPS.PEARL_WALLET_SCREEN;
    rerender(<PearlWallet />);

    expect(
      mockUpdateStep.mock.calls.filter(([step]) => step === STEPS.DEPOSIT),
    ).toHaveLength(1);
  });

  it.each([
    ['only quoted', makeFundingRun({ mode: 'deposit' })],
    ['for onboarding', makeFundingRun({ mode: 'onboard', quote: fundedQuote })],
  ])('stays on the wallet for a run %s', (_label, run) => {
    mockActiveRun = run;
    render(<PearlWallet />);

    expect(mockUpdateStep).not.toHaveBeenCalledWith(STEPS.DEPOSIT);
  });
});
