import { render, screen } from '@testing-library/react';
import React from 'react';

import { TransactionHistory } from '../../../../components/PearlWallet/History/TransactionHistory';
import { EvmChainIdMap } from '../../../../constants/chains';
import {
  DEFAULT_SAFE_ADDRESS,
  makeFundsMovement,
  MOCK_TX_HASH_1,
} from '../../../helpers/factories';

const mockUsePearlWallet = jest.fn();
jest.mock('../../../../context/PearlWalletProvider', () => ({
  usePearlWallet: () => mockUsePearlWallet(),
}));

const mockUseTransactionHistory = jest.fn();
jest.mock('../../../../hooks/useTransactionHistory', () => ({
  useTransactionHistory: (args: unknown) => mockUseTransactionHistory(args),
}));

const mockUseServices = jest.fn(() => ({
  services: undefined,
  getAgentTypeFromService: () => null,
}));
jest.mock('../../../../hooks/useServices', () => ({
  useServices: () => mockUseServices(),
}));

// Stub out the icon module so the section renders without ant icon font deps.
jest.mock(
  '../../../../components/PearlWallet/History/TransactionRowIcon',
  () => ({
    TransactionRowIcon: () => <span data-testid="row-icon" />,
  }),
);

describe('TransactionHistory section', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePearlWallet.mockReturnValue({
      walletChainId: EvmChainIdMap.Gnosis,
      masterSafeAddress: DEFAULT_SAFE_ADDRESS,
    });
  });

  it('renders nothing when there is no Master Safe', () => {
    mockUsePearlWallet.mockReturnValueOnce({
      walletChainId: EvmChainIdMap.Gnosis,
      masterSafeAddress: null,
    });
    mockUseTransactionHistory.mockReturnValue({
      rows: [],
      meta: null,
      isFetched: false,
      isLoading: false,
      isError: false,
    });

    const { container } = render(<TransactionHistory />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the empty state when fetched with zero rows', () => {
    mockUseTransactionHistory.mockReturnValue({
      rows: [],
      meta: { block: { number: 1 }, hasIndexingErrors: false },
      isFetched: true,
      isLoading: false,
      isError: false,
    });

    render(<TransactionHistory />);
    expect(
      screen.getByText('There are no transaction records yet.'),
    ).toBeInTheDocument();
  });

  it('renders the stale-data banner when the subgraph reports indexing errors', () => {
    mockUseTransactionHistory.mockReturnValue({
      rows: [],
      meta: { block: { number: 1 }, hasIndexingErrors: true },
      isFetched: true,
      isLoading: false,
      isError: false,
    });

    render(<TransactionHistory />);
    expect(
      screen.getByText('Recent transactions may not appear yet'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Wallet operations work normally. This usually resolves on its own.',
      ),
    ).toBeInTheDocument();
  });

  it('renders the loading state when isLoading and not yet fetched', () => {
    mockUseTransactionHistory.mockReturnValue({
      rows: [],
      meta: null,
      isFetched: false,
      isLoading: true,
      isError: false,
    });

    const { container } = render(<TransactionHistory />);
    expect(container.querySelector('.ant-spin')).toBeTruthy();
  });

  it('renders an error message when the query errors out', () => {
    mockUseTransactionHistory.mockReturnValue({
      rows: [],
      meta: null,
      isFetched: true,
      isLoading: false,
      isError: true,
    });

    render(<TransactionHistory />);
    expect(
      screen.getByText('Error loading transaction history.'),
    ).toBeInTheDocument();
  });

  it('renders rows when the query succeeds', () => {
    const movement = makeFundsMovement({
      category: 'MASTER_FUNDING_IN',
      amount: '10000000000000000000', // 10 native
      transactionHash: MOCK_TX_HASH_1,
    });

    mockUseTransactionHistory.mockReturnValue({
      rows: [
        {
          id: 'row-1',
          category: movement.category,
          blockTimestamp: 1_720_000_000,
          transactionHash: movement.transactionHash,
          agentSafeAddress: null,
          agentInstanceAddress: null,
          transfers: [
            {
              tokenAddress: null,
              amount: movement.amount,
              direction: 'in' as const,
            },
          ],
        },
      ],
      meta: { block: { number: 1 }, hasIndexingErrors: false },
      isFetched: true,
      isLoading: false,
      isError: false,
    });

    render(<TransactionHistory />);
    expect(screen.getByText('Deposit')).toBeInTheDocument();
    expect(screen.getByText('+10.00')).toBeInTheDocument();
  });
});
