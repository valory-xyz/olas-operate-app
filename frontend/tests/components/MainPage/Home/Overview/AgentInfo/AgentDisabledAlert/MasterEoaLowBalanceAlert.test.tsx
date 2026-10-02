import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { MasterEoaLowBalanceAlert } from '../../../../../../../components/MainPage/Home/Overview/AgentInfo/AgentDisabledAlert/MasterEoaLowBalanceAlert';
import { EvmChainIdMap, PAGES } from '../../../../../../../constants';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../../../../../../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../../../../../../constants/providers', () => ({
  PROVIDERS: {},
}));

jest.mock('../../../../../../../components/ui', () => ({
  Alert: ({ message }: { message: React.ReactNode }) => (
    <div data-testid="alert">{message}</div>
  ),
}));

const mockGoto = jest.fn();
let mockIsLowOnGas = true;
jest.mock('../../../../../../../hooks', () => ({
  usePageState: () => ({ goto: mockGoto }),
  useServices: () => ({
    selectedAgentConfig: { evmHomeChainId: EvmChainIdMap.Polygon },
  }),
  useMasterBalances: () => ({
    isMasterEoaLowOnGas: mockIsLowOnGas,
    masterEoaGasRequirement: 2,
  }),
}));

describe('MasterEoaLowBalanceAlert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsLowOnGas = true;
  });

  it('renders nothing while the Pearl Signer has enough gas', () => {
    mockIsLowOnGas = false;
    const { container } = render(<MasterEoaLowBalanceAlert />);
    expect(container).toBeEmptyDOMElement();
  });

  it('keeps its existing funding copy', () => {
    render(<MasterEoaLowBalanceAlert />);
    expect(
      screen.getByText(/Please fund your Pearl Wallet with/),
    ).toHaveTextContent('Please fund your Pearl Wallet with 2 POL');
  });

  it('opens the funding flow for the home chain', () => {
    render(<MasterEoaLowBalanceAlert />);
    fireEvent.click(screen.getByRole('button', { name: 'Fund Pearl Wallet' }));
    expect(mockGoto).toHaveBeenCalledWith(PAGES.FundPearlWallet, {
      chain: 'polygon',
    });
  });
});
