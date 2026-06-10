import { fireEvent, render, screen } from '@testing-library/react';
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

  it('hides the data-delay banner when there are no transactions', () => {
    mockUseTransactionHistory.mockReturnValue({
      rows: [],
      meta: { block: { number: 1 }, hasIndexingErrors: false },
      isFetched: true,
      isLoading: false,
      isError: false,
    });

    render(<TransactionHistory />);
    expect(
      screen.queryByText('Recent transactions may not appear yet'),
    ).not.toBeInTheDocument();
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
    // The data-delay banner shows alongside actual history.
    expect(
      screen.getByText('Recent transactions may not appear yet'),
    ).toBeInTheDocument();
  });

  it('pages rows client-side via a "Load more" button', () => {
    const rows = Array.from({ length: 15 }, (_, i) => ({
      id: `row-${i}`,
      category: 'MASTER_FUNDING_IN' as const,
      blockTimestamp: 1_720_000_000 - i,
      transactionHash: MOCK_TX_HASH_1,
      agentSafeAddress: null,
      agentInstanceAddress: null,
      transfers: [
        {
          tokenAddress: null,
          amount: '10000000000000000000',
          direction: 'in' as const,
        },
      ],
    }));

    mockUseTransactionHistory.mockReturnValue({
      rows,
      meta: { block: { number: 1 }, hasIndexingErrors: false },
      isFetched: true,
      isLoading: false,
      isError: false,
      isUnavailable: false,
    });

    render(<TransactionHistory />);

    // First page shows 10 of 15, with a "Load more" affordance.
    expect(screen.getAllByTestId('row-icon')).toHaveLength(10);
    const loadMore = screen.getByRole('button', { name: 'Load more' });

    fireEvent.click(loadMore);

    // All 15 now visible; the button is gone.
    expect(screen.getAllByTestId('row-icon')).toHaveLength(15);
    expect(
      screen.queryByRole('button', { name: 'Load more' }),
    ).not.toBeInTheDocument();
  });
});
