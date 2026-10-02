import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { FundingFlowProps } from '../../components/FundingFlow';
import {
  FundPearlWallet,
  UNSUPPORTED_CHAIN_ERROR,
} from '../../components/FundPearlWallet';
import { EvmChainIdMap } from '../../constants/chains';
import { PAGES } from '../../constants/pages';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../constants/providers', () => ({ PROVIDERS: {} }));

const mockClearNavParams = jest.fn();
const mockGoto = jest.fn();
let mockNavParams: Record<string, unknown> = {};

jest.mock('../../hooks', () => ({
  usePageState: () => ({
    goto: mockGoto,
    navParams: mockNavParams,
    clearNavParams: mockClearNavParams,
  }),
  useServices: () => ({
    selectedAgentConfig: { evmHomeChainId: EvmChainIdMap.Gnosis },
  }),
  useMasterBalances: () => ({ masterEoaGasRequirement: 0.5 }),
}));

jest.mock('../../components/FundingFlow', () => ({
  FundingFlow: (props: FundingFlowProps) => (
    <div data-testid="funding-flow">
      <span data-testid="flow-mode">{props.mode}</span>
      <span data-testid="flow-chain">{props.destinationChain}</span>
      {props.fallbackToReceive?.map((item) => (
        <span key={item.symbol} data-testid={`token-${item.symbol}`}>
          {item.amount}
        </span>
      ))}
      <button onClick={props.onBack}>back</button>
      <button onClick={props.onBackToPearlWallet}>back to wallet</button>
      <button onClick={props.onTransferCompleted}>done</button>
    </div>
  ),
}));

describe('FundPearlWallet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavParams = {};
  });

  it('renders the funding flow in signer-gas mode for the home chain by default', () => {
    render(<FundPearlWallet />);
    expect(screen.getByTestId('flow-mode')).toHaveTextContent('signer_gas');
    expect(screen.getByTestId('flow-chain')).toHaveTextContent('gnosis');
    expect(screen.getByTestId('token-XDAI')).toHaveTextContent('0.5');
  });

  it('funds the chain named by the gas error', () => {
    mockNavParams = { chain: 'base' };
    render(<FundPearlWallet />);
    expect(screen.getByTestId('flow-chain')).toHaveTextContent('base');
    // The home-chain requirement does not describe another chain's reserve.
    expect(screen.queryByTestId('token-XDAI')).toBeNull();
  });

  it('refuses a chain it cannot top up instead of funding the home chain', () => {
    mockNavParams = { chain: 'solana' };
    render(<FundPearlWallet />);
    expect(screen.queryByTestId('funding-flow')).toBeNull();
    expect(screen.getByText(UNSUPPORTED_CHAIN_ERROR)).toBeInTheDocument();
  });

  it('keeps the captured chain after navParams are cleared', () => {
    mockNavParams = { chain: 'base' };
    const { rerender } = render(<FundPearlWallet />);
    expect(mockClearNavParams).toHaveBeenCalled();
    mockNavParams = {};
    rerender(<FundPearlWallet />);
    expect(screen.getByTestId('flow-chain')).toHaveTextContent('base');
  });

  it('goes back to Main, and to the Pearl Wallet once the transfer completes', () => {
    render(<FundPearlWallet />);
    fireEvent.click(screen.getByText('back'));
    expect(mockGoto).toHaveBeenCalledWith(PAGES.Main);
    fireEvent.click(screen.getByText('done'));
    expect(mockGoto).toHaveBeenCalledWith(PAGES.PearlWallet);
  });

  it('offers a way back to the Pearl Wallet before the transfer completes', () => {
    render(<FundPearlWallet />);
    fireEvent.click(screen.getByText('back to wallet'));
    expect(mockGoto).toHaveBeenCalledWith(PAGES.PearlWallet);
  });
});
