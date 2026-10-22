import { renderHook, waitFor } from '@testing-library/react';

import { EvmChainIdMap } from '../../constants/chains';
import { TRANSACTION_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN } from '../../constants/urls';
import {
  buildTransactionHistoryRows,
  useTransactionHistory,
} from '../../hooks/useTransactionHistory';
import { TransactionHistoryService } from '../../service/TransactionHistory';
import { Address } from '../../types/Address';
import {
  DEFAULT_EOA_ADDRESS,
  DEFAULT_SAFE_ADDRESS,
  makeAgentFundingEvent,
  makeFundsMovement,
  makeTransactionHistoryResponse,
  MOCK_INSTANCE_ADDRESS,
  MOCK_MULTISIG_ADDRESS,
  MOCK_OLAS_TOKEN_ADDRESS,
  MOCK_TX_HASH_1,
  MOCK_TX_HASH_2,
  MOCK_TX_HASH_3,
} from '../helpers/factories';
import { createQueryClientWrapper } from '../helpers/queryClient';

jest.mock('../../service/TransactionHistory', () => ({
  TransactionHistoryService: { get: jest.fn(), getAll: jest.fn() },
}));

const mockedGet = TransactionHistoryService.getAll as jest.Mock;

describe('buildTransactionHistoryRows', () => {
  it('returns an empty list for an empty response', () => {
    const rows = buildTransactionHistoryRows(
      makeTransactionHistoryResponse(),
      DEFAULT_SAFE_ADDRESS,
    );
    expect(rows).toEqual([]);
  });

  it('groups multi-token MASTER_WITHDRAWAL by transaction hash into one row', () => {
    const data = makeTransactionHistoryResponse({
      fundsMovements: [
        makeFundsMovement({
          id: 'm-0',
          category: 'MASTER_WITHDRAWAL',
          token: MOCK_OLAS_TOKEN_ADDRESS,
          amount: '1000',
          from: DEFAULT_SAFE_ADDRESS,
          to: DEFAULT_EOA_ADDRESS,
          transactionHash: MOCK_TX_HASH_1,
          blockTimestamp: '100',
        }),
        makeFundsMovement({
          id: 'm-1',
          category: 'MASTER_WITHDRAWAL',
          token: null,
          amount: '2000',
          from: DEFAULT_SAFE_ADDRESS,
          to: DEFAULT_EOA_ADDRESS,
          transactionHash: MOCK_TX_HASH_1,
          blockTimestamp: '100',
        }),
      ],
    });

    const rows = buildTransactionHistoryRows(data, DEFAULT_SAFE_ADDRESS);

    expect(rows).toHaveLength(1);
    expect(rows[0].transfers).toHaveLength(2);
    expect(rows[0].transfers.map((t) => t.tokenAddress)).toEqual([
      MOCK_OLAS_TOKEN_ADDRESS,
      null,
    ]);
    expect(rows[0].transfers.every((t) => t.direction === 'out')).toBe(true);
    expect(rows[0].category).toBe('MASTER_WITHDRAWAL');
  });

  it('keeps rows for the same tx separate when categories differ', () => {
    const data = makeTransactionHistoryResponse({
      fundsMovements: [
        makeFundsMovement({
          id: 'm-0',
          category: 'SERVICE_BOND_DEPOSIT',
          transactionHash: MOCK_TX_HASH_1,
          blockTimestamp: '100',
        }),
        makeFundsMovement({
          id: 'm-1',
          category: 'MASTER_WITHDRAWAL',
          transactionHash: MOCK_TX_HASH_1,
          blockTimestamp: '100',
        }),
      ],
    });

    const rows = buildTransactionHistoryRows(data, DEFAULT_SAFE_ADDRESS);
    expect(rows.map((r) => r.category).sort()).toEqual([
      'MASTER_WITHDRAWAL',
      'SERVICE_BOND_DEPOSIT',
    ]);
  });

  it('collapses the two SERVICE_BOND_DEPOSIT rows from one stake-cycle tx', () => {
    const stakeTx = MOCK_TX_HASH_1;
    const data = makeTransactionHistoryResponse({
      fundsMovements: [
        makeFundsMovement({
          id: `${stakeTx}-0`,
          category: 'SERVICE_BOND_DEPOSIT',
          bondType: 'SECURITY_DEPOSIT',
          amount: '2500',
          transactionHash: stakeTx,
          blockTimestamp: '100',
        }),
        makeFundsMovement({
          id: `${stakeTx}-1`,
          category: 'SERVICE_BOND_DEPOSIT',
          bondType: 'AGENT_BOND',
          amount: '2500',
          transactionHash: stakeTx,
          blockTimestamp: '100',
        }),
      ],
    });

    const rows = buildTransactionHistoryRows(data, DEFAULT_SAFE_ADDRESS);
    expect(rows).toHaveLength(1);
    expect(rows[0].transfers).toHaveLength(2);
    expect(rows[0].transfers.every((t) => t.direction === 'out')).toBe(true);
  });

  it('renders AgentFundingEvent as a single row with all child transfers', () => {
    const fundingTx = MOCK_TX_HASH_2;
    const data = makeTransactionHistoryResponse({
      agentFundingEvents: [
        makeAgentFundingEvent({
          txHash: fundingTx,
          blockTimestamp: '200',
          transfers: [
            makeFundsMovement({
              id: `${fundingTx}-0`,
              category: 'MASTER_TO_AGENT',
              token: MOCK_OLAS_TOKEN_ADDRESS,
              amount: '1',
              from: DEFAULT_SAFE_ADDRESS,
              to: MOCK_MULTISIG_ADDRESS,
              transactionHash: fundingTx,
              blockTimestamp: '200',
              agentSafe: {
                id: MOCK_MULTISIG_ADDRESS,
                service: { id: '42', agentIds: [25] },
              },
            }),
            makeFundsMovement({
              id: `${fundingTx}-1`,
              category: 'MASTER_TO_AGENT',
              token: null,
              amount: '2',
              from: DEFAULT_SAFE_ADDRESS,
              to: MOCK_MULTISIG_ADDRESS,
              transactionHash: fundingTx,
              blockTimestamp: '200',
            }),
          ],
        }),
      ],
    });

    const rows = buildTransactionHistoryRows(data, DEFAULT_SAFE_ADDRESS);

    expect(rows).toHaveLength(1);
    expect(rows[0].category).toBe('MASTER_TO_AGENT');
    expect(rows[0].transfers).toHaveLength(2);
    expect(rows[0].agentSafeAddress).toBe(MOCK_MULTISIG_ADDRESS);
    expect(rows[0].agentInstanceAddress).toBeNull();
  });

  it('does not double-count standalone movements that belong to an AgentFundingEvent', () => {
    const fundingTx = MOCK_TX_HASH_2;
    const data = makeTransactionHistoryResponse({
      fundsMovements: [
        // This standalone row shares the txHash of the AgentFundingEvent.
        makeFundsMovement({
          id: `${fundingTx}-standalone`,
          category: 'MASTER_TO_AGENT',
          transactionHash: fundingTx,
        }),
      ],
      agentFundingEvents: [makeAgentFundingEvent({ txHash: fundingTx })],
    });

    const rows = buildTransactionHistoryRows(data, DEFAULT_SAFE_ADDRESS);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(makeAgentFundingEvent({ txHash: fundingTx }).id);
  });

  it('keeps non-MASTER_TO_AGENT movements that share a txHash with an AgentFundingEvent', () => {
    // A batched tx combining agent funding with a withdrawal: the dedup is
    // scoped to MASTER_TO_AGENT, so the withdrawal must keep its own row.
    const fundingTx = MOCK_TX_HASH_2;
    const data = makeTransactionHistoryResponse({
      fundsMovements: [
        makeFundsMovement({
          id: `${fundingTx}-withdrawal`,
          category: 'MASTER_WITHDRAWAL',
          transactionHash: fundingTx,
        }),
      ],
      agentFundingEvents: [makeAgentFundingEvent({ txHash: fundingTx })],
    });

    const rows = buildTransactionHistoryRows(data, DEFAULT_SAFE_ADDRESS);
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.category).sort()).toEqual([
      'MASTER_TO_AGENT',
      'MASTER_WITHDRAWAL',
    ]);
  });

  it('flags Agent EOA recipients on STANDALONE MASTER_TO_AGENT rows', () => {
    // Native gas top-up to the Agent EOA that lands outside an
    // AgentFundingEvent. The row must surface agentInstanceAddress so the
    // UI renders "Allocated for execution costs".
    const data = makeTransactionHistoryResponse({
      fundsMovements: [
        makeFundsMovement({
          category: 'MASTER_TO_AGENT',
          token: null,
          amount: '1',
          from: DEFAULT_SAFE_ADDRESS,
          to: MOCK_INSTANCE_ADDRESS,
          transactionHash: MOCK_TX_HASH_1,
          agentSafe: {
            id: MOCK_MULTISIG_ADDRESS,
            service: { id: '42', agentIds: [25] },
          },
        }),
      ],
    });

    const rows = buildTransactionHistoryRows(data, DEFAULT_SAFE_ADDRESS);
    expect(rows).toHaveLength(1);
    expect(rows[0].agentInstanceAddress).toBe(MOCK_INSTANCE_ADDRESS);
    expect(rows[0].agentSafeAddress).toBe(MOCK_MULTISIG_ADDRESS);
  });

  it('does NOT flag Agent EOA on standalone MASTER_TO_AGENT when recipient IS the AgentSafe', () => {
    const data = makeTransactionHistoryResponse({
      fundsMovements: [
        makeFundsMovement({
          category: 'MASTER_TO_AGENT',
          to: MOCK_MULTISIG_ADDRESS,
          transactionHash: MOCK_TX_HASH_1,
          agentSafe: {
            id: MOCK_MULTISIG_ADDRESS,
            service: { id: '42', agentIds: [25] },
          },
        }),
      ],
    });

    const rows = buildTransactionHistoryRows(data, DEFAULT_SAFE_ADDRESS);
    expect(rows[0].agentInstanceAddress).toBeNull();
  });

  it('flags Agent EOA recipients in AgentFundingEvent rows', () => {
    const fundingTx = MOCK_TX_HASH_3;
    const data = makeTransactionHistoryResponse({
      agentFundingEvents: [
        makeAgentFundingEvent({
          txHash: fundingTx,
          transfers: [
            makeFundsMovement({
              category: 'MASTER_TO_AGENT',
              token: null,
              amount: '1',
              from: DEFAULT_SAFE_ADDRESS,
              to: MOCK_INSTANCE_ADDRESS,
              transactionHash: fundingTx,
              agentSafe: {
                id: MOCK_MULTISIG_ADDRESS,
                service: { id: '42', agentIds: [25] },
              },
            }),
          ],
        }),
      ],
    });

    const rows = buildTransactionHistoryRows(data, DEFAULT_SAFE_ADDRESS);
    expect(rows[0].agentInstanceAddress).toBe(MOCK_INSTANCE_ADDRESS);
  });

  it('does NOT flag Agent EOA on a mixed Safe+EOA funding event', () => {
    // The canonical Pearl funding tx funds the Agent Safe and the Agent EOA
    // in one event — it must render "Fund <agent>", not "Allocated for
    // execution costs", so the EOA flag only applies to EOA-only events.
    const fundingTx = MOCK_TX_HASH_3;
    const agentSafe = {
      id: MOCK_MULTISIG_ADDRESS,
      service: { id: '42', agentIds: [25] },
    };
    const data = makeTransactionHistoryResponse({
      agentFundingEvents: [
        makeAgentFundingEvent({
          txHash: fundingTx,
          transfers: [
            makeFundsMovement({
              id: `${fundingTx}-safe`,
              category: 'MASTER_TO_AGENT',
              token: null,
              amount: '1',
              from: DEFAULT_SAFE_ADDRESS,
              to: MOCK_MULTISIG_ADDRESS,
              transactionHash: fundingTx,
              agentSafe,
            }),
            makeFundsMovement({
              id: `${fundingTx}-eoa`,
              category: 'MASTER_TO_AGENT',
              token: null,
              amount: '2',
              from: DEFAULT_SAFE_ADDRESS,
              to: MOCK_INSTANCE_ADDRESS,
              transactionHash: fundingTx,
              agentSafe,
            }),
          ],
        }),
      ],
    });

    const rows = buildTransactionHistoryRows(data, DEFAULT_SAFE_ADDRESS);
    expect(rows).toHaveLength(1);
    expect(rows[0].agentInstanceAddress).toBeNull();
    expect(rows[0].agentSafeAddress).toBe(MOCK_MULTISIG_ADDRESS);
  });

  it('does NOT flag Agent EOA on a mixed Safe+EOA standalone MASTER_TO_AGENT group', () => {
    const tx = MOCK_TX_HASH_1;
    const agentSafe = {
      id: MOCK_MULTISIG_ADDRESS,
      service: { id: '42', agentIds: [25] },
    };
    const data = makeTransactionHistoryResponse({
      fundsMovements: [
        makeFundsMovement({
          id: `${tx}-eoa`,
          category: 'MASTER_TO_AGENT',
          to: MOCK_INSTANCE_ADDRESS,
          transactionHash: tx,
          agentSafe,
        }),
        makeFundsMovement({
          id: `${tx}-safe`,
          category: 'MASTER_TO_AGENT',
          to: MOCK_MULTISIG_ADDRESS,
          transactionHash: tx,
          agentSafe,
        }),
      ],
    });

    const rows = buildTransactionHistoryRows(data, DEFAULT_SAFE_ADDRESS);
    expect(rows).toHaveLength(1);
    expect(rows[0].agentInstanceAddress).toBeNull();
  });

  it('sorts rows by blockTimestamp descending', () => {
    const data = makeTransactionHistoryResponse({
      fundsMovements: [
        makeFundsMovement({
          id: 'oldest',
          transactionHash: MOCK_TX_HASH_1,
          blockTimestamp: '100',
        }),
        makeFundsMovement({
          id: 'newest',
          transactionHash: MOCK_TX_HASH_2,
          blockTimestamp: '300',
          category: 'MASTER_WITHDRAWAL',
        }),
        makeFundsMovement({
          id: 'middle',
          transactionHash: MOCK_TX_HASH_3,
          blockTimestamp: '200',
          category: 'SERVICE_BOND_DEPOSIT',
        }),
      ],
    });

    const rows = buildTransactionHistoryRows(data, DEFAULT_SAFE_ADDRESS);
    expect(rows.map((r) => r.blockTimestamp)).toEqual([300, 200, 100]);
  });

  it('marks AGENT_TO_MASTER as inbound and SERVICE_BOND_DEPOSIT as outbound', () => {
    const data = makeTransactionHistoryResponse({
      fundsMovements: [
        makeFundsMovement({
          category: 'AGENT_TO_MASTER',
          transactionHash: MOCK_TX_HASH_1,
        }),
        makeFundsMovement({
          id: 'deposit',
          category: 'SERVICE_BOND_DEPOSIT',
          transactionHash: MOCK_TX_HASH_2,
        }),
      ],
    });

    const rows = buildTransactionHistoryRows(data, DEFAULT_SAFE_ADDRESS);
    const byCategory = Object.fromEntries(rows.map((r) => [r.category, r]));
    expect(byCategory.AGENT_TO_MASTER.transfers[0].direction).toBe('in');
    expect(byCategory.SERVICE_BOND_DEPOSIT.transfers[0].direction).toBe('out');
  });

  it('hides OLAS agent→master reward sweeps but keeps native agent→master', () => {
    const OLAS_GNOSIS = '0xce11e14225575945b8e6dc0d4f2dd4c570f79d9f';
    const data = makeTransactionHistoryResponse({
      fundsMovements: [
        makeFundsMovement({
          id: 'reward-sweep',
          category: 'AGENT_TO_MASTER',
          token: OLAS_GNOSIS,
          transactionHash: MOCK_TX_HASH_1,
        }),
        makeFundsMovement({
          id: 'native-return',
          category: 'AGENT_TO_MASTER',
          token: null,
          transactionHash: MOCK_TX_HASH_2,
        }),
      ],
      agentFundingEvents: [],
    });

    const rows = buildTransactionHistoryRows(
      data,
      DEFAULT_SAFE_ADDRESS,
      EvmChainIdMap.Gnosis,
    );

    // The OLAS reward sweep is dropped; the native agent→master return is kept.
    expect(rows).toHaveLength(1);
    expect(rows[0].category).toBe('AGENT_TO_MASTER');
    expect(rows[0].transactionHash).toBe(MOCK_TX_HASH_2);
  });
});

describe('useTransactionHistory', () => {
  // Gnosis ships a real URL in source — snapshot and restore rather than
  // deleting, so the module-registry copy isn't left missing real config.
  const ORIGINAL_GNOSIS_URL =
    TRANSACTION_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN[EvmChainIdMap.Gnosis];

  beforeEach(() => {
    mockedGet.mockReset();
    // The hook only fetches when a subgraph URL exists for the chain.
    TRANSACTION_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN[EvmChainIdMap.Gnosis] =
      'https://pearl-transactions.subgraph.example';
  });

  afterEach(() => {
    TRANSACTION_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN[EvmChainIdMap.Gnosis] =
      ORIGINAL_GNOSIS_URL;
  });

  it('does not fetch when chainId or masterSafe is missing', async () => {
    const wrapper = createQueryClientWrapper();
    const { result } = renderHook(
      () =>
        useTransactionHistory({
          chainId: undefined,
          masterSafe: undefined,
        }),
      { wrapper },
    );

    expect(mockedGet).not.toHaveBeenCalled();
    expect(result.current.rows).toEqual([]);
    expect(result.current.isFetched).toBe(false);
  });

  it('reports isUnavailable when the chain has no subgraph URL', async () => {
    delete TRANSACTION_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN[EvmChainIdMap.Gnosis];

    const wrapper = createQueryClientWrapper();
    const { result } = renderHook(
      () =>
        useTransactionHistory({
          chainId: EvmChainIdMap.Gnosis,
          masterSafe: DEFAULT_SAFE_ADDRESS,
        }),
      { wrapper },
    );

    expect(result.current.isUnavailable).toBe(true);
    expect(mockedGet).not.toHaveBeenCalled();
    expect(result.current.rows).toEqual([]);
  });

  it('returns parsed rows when fetched', async () => {
    mockedGet.mockResolvedValue(
      makeTransactionHistoryResponse({
        fundsMovements: [makeFundsMovement({ category: 'MASTER_FUNDING_IN' })],
      }),
    );

    const wrapper = createQueryClientWrapper();
    const { result } = renderHook(
      () =>
        useTransactionHistory({
          chainId: EvmChainIdMap.Gnosis,
          masterSafe: DEFAULT_SAFE_ADDRESS,
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isFetched).toBe(true));

    expect(mockedGet).toHaveBeenCalledWith({
      chainId: EvmChainIdMap.Gnosis,
      masterSafe: DEFAULT_SAFE_ADDRESS,
    });
    expect(result.current.rows).toHaveLength(1);
    expect(result.current.rows[0].category).toBe('MASTER_FUNDING_IN');
    expect(result.current.meta?.hasIndexingErrors).toBe(false);
    expect(result.current.masterSafeEntity?.id).toBe(DEFAULT_SAFE_ADDRESS);
  });

  it('surfaces query errors', async () => {
    mockedGet.mockRejectedValue(new Error('boom'));

    const wrapper = createQueryClientWrapper();
    const { result } = renderHook(
      () =>
        useTransactionHistory({
          chainId: EvmChainIdMap.Gnosis,
          masterSafe: DEFAULT_SAFE_ADDRESS,
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.rows).toEqual([]);
  });

  it('does not crash if masterSafe address changes mid-render', async () => {
    mockedGet.mockResolvedValue(makeTransactionHistoryResponse());

    const wrapper = createQueryClientWrapper();
    const { result, rerender } = renderHook(
      ({ masterSafe }: { masterSafe: Address | undefined }) =>
        useTransactionHistory({
          chainId: EvmChainIdMap.Gnosis,
          masterSafe,
        }),
      {
        wrapper,
        initialProps: {
          masterSafe: DEFAULT_SAFE_ADDRESS as Address | undefined,
        },
      },
    );

    await waitFor(() => expect(result.current.isFetched).toBe(true));
    rerender({ masterSafe: undefined });
    expect(result.current.rows).toEqual([]);
  });
});
