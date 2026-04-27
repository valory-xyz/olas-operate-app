import { render, screen } from '@testing-library/react';
import React from 'react';

import { FundPearlWallet } from '../../components/FundPearlWallet';
import { EvmChainIdMap } from '../../constants/chains';
import { DEFAULT_EOA_ADDRESS } from '../helpers/factories';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../constants/providers', () => ({}));

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
  useMasterWalletContext: () => ({
    masterEoa: { address: DEFAULT_EOA_ADDRESS },
  }),
}));

jest.mock('../../components/PearlWallet', () => ({
  TransferCryptoFromExternalWallet: ({
    tokensToDeposit,
    address,
    chainName,
  }: {
    tokensToDeposit: Array<{ symbol: string; amount: number }>;
    address: string;
    chainName: string;
  }) => (
    <div data-testid="transfer-crypto">
      <span data-testid="transfer-chain">{chainName}</span>
      <span data-testid="transfer-address">{address}</span>
      {tokensToDeposit.map((t) => (
        <span key={t.symbol} data-testid={`token-${t.symbol}`}>
          {t.amount}
        </span>
      ))}
    </div>
  ),
}));

describe('FundPearlWallet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavParams = {};
  });

  it('falls back to masterEoaGasRequirement when no navParams are supplied', () => {
    render(<FundPearlWallet />);
    expect(screen.getByTestId('token-XDAI')).toHaveTextContent('0.5');
  });

  it('uses navParams.prefillAmountWei when present (Gnosis: 0.75 xDAI)', () => {
    mockNavParams = { prefillAmountWei: 750_000_000_000_000_000 };
    render(<FundPearlWallet />);
    expect(screen.getByTestId('token-XDAI')).toHaveTextContent('0.75');
  });

  it('accepts prefillAmountWei as a string', () => {
    mockNavParams = { prefillAmountWei: '2500000000000000' };
    render(<FundPearlWallet />);
    expect(screen.getByTestId('token-XDAI')).toHaveTextContent('0.0025');
  });

  it('clears navParams on mount so subsequent navigations without params do not inherit the override', () => {
    mockNavParams = { prefillAmountWei: 750_000_000_000_000_000 };
    render(<FundPearlWallet />);
    expect(mockClearNavParams).toHaveBeenCalled();
  });

  it('retains the captured prefill amount even after navParams are cleared', () => {
    mockNavParams = { prefillAmountWei: 750_000_000_000_000_000 };
    const { rerender } = render(<FundPearlWallet />);
    // Simulate navParams being cleared after useEffect runs
    mockNavParams = {};
    rerender(<FundPearlWallet />);
    expect(screen.getByTestId('token-XDAI')).toHaveTextContent('0.75');
  });

  it('routes deposits to the master EOA address', () => {
    render(<FundPearlWallet />);
    expect(screen.getByTestId('transfer-address')).toHaveTextContent(
      DEFAULT_EOA_ADDRESS,
    );
  });
});
