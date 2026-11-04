import { EvmChainIdMap } from '../../constants/chains';
import { buildAgentTransactionHistoryRows } from '../../hooks/useAgentTransactionHistory';
import {
  AgentTransactionHistoryResponse,
  FundsMovement,
} from '../../types/TransactionHistory';
import {
  makeFundsMovement,
  makeSubgraphMeta,
  MOCK_INSTANCE_ADDRESS,
  MOCK_MULTISIG_ADDRESS,
  MOCK_OLAS_TOKEN_ADDRESS,
  MOCK_TX_HASH_1,
  MOCK_TX_HASH_2,
  MOCK_USDC_E_TOKEN_ADDRESS,
} from '../helpers/factories';

const resp = (
  fundsMovements: FundsMovement[],
): AgentTransactionHistoryResponse => ({
  fundsMovements,
  _meta: makeSubgraphMeta(),
});

const agentSafeRef = { id: MOCK_MULTISIG_ADDRESS, service: null };

describe('buildAgentTransactionHistoryRows', () => {
  it('returns an empty list for an empty response', () => {
    expect(buildAgentTransactionHistoryRows(resp([]))).toEqual([]);
  });

  it('marks MASTER_TO_AGENT inbound and AGENT_TO_MASTER outbound (by category)', () => {
    const rows = buildAgentTransactionHistoryRows(
      resp([
        makeFundsMovement({
          id: 'fund',
          category: 'MASTER_TO_AGENT',
          token: MOCK_USDC_E_TOKEN_ADDRESS,
          to: MOCK_MULTISIG_ADDRESS,
          transactionHash: MOCK_TX_HASH_1,
          blockTimestamp: '200',
          agentSafe: agentSafeRef,
        }),
        makeFundsMovement({
          id: 'withdraw',
          category: 'AGENT_TO_MASTER',
          token: MOCK_USDC_E_TOKEN_ADDRESS,
          from: MOCK_MULTISIG_ADDRESS,
          transactionHash: MOCK_TX_HASH_2,
          blockTimestamp: '100',
          agentSafe: agentSafeRef,
        }),
      ]),
      EvmChainIdMap.Gnosis,
    );

    const byCategory = Object.fromEntries(rows.map((r) => [r.category, r]));
    expect(byCategory.MASTER_TO_AGENT.transfers[0].direction).toBe('in');
    expect(byCategory.AGENT_TO_MASTER.transfers[0].direction).toBe('out');
  });

  it('marks AGENT_SAFE_TO_AGENT_EOA internal (neither inflow nor outflow)', () => {
    const rows = buildAgentTransactionHistoryRows(
      resp([
        makeFundsMovement({
          category: 'AGENT_SAFE_TO_AGENT_EOA',
          source: 'SEMANTIC',
          token: null,
          from: MOCK_MULTISIG_ADDRESS,
          to: MOCK_INSTANCE_ADDRESS,
          transactionHash: MOCK_TX_HASH_1,
          agentSafe: agentSafeRef,
        }),
      ]),
      EvmChainIdMap.Gnosis,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].category).toBe('AGENT_SAFE_TO_AGENT_EOA');
    expect(rows[0].transfers[0].direction).toBe('internal');
  });

  it('marks a MASTER_TO_AGENT leg that lands on the Agent Signer as inbound', () => {
    // Regression for the address-based direction bug: the Agent Signer leg
    // lands on the Signer (not the Safe) but still carries the agentSafe ref,
    // so the query returns it. Direction is by category, so it is inbound.
    const rows = buildAgentTransactionHistoryRows(
      resp([
        makeFundsMovement({
          category: 'MASTER_TO_AGENT',
          token: null, // native gas
          to: MOCK_INSTANCE_ADDRESS, // Agent EOA, not the Safe
          transactionHash: MOCK_TX_HASH_1,
          agentSafe: agentSafeRef,
        }),
      ]),
      EvmChainIdMap.Gnosis,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].transfers[0].direction).toBe('in');
  });

  it('splits a Fund Agent transfer into an Agent Safe row and an Agent Signer row', () => {
    // ZD#1285: one MultiSend paid the Agent Safe and the Agent Signer. The
    // Agent Wallet shows each side as its own row, adding up to what the
    // user approved.
    const rows = buildAgentTransactionHistoryRows(
      resp([
        makeFundsMovement({
          id: 'safe',
          category: 'MASTER_TO_AGENT',
          token: null,
          amount: '78019210675581',
          to: MOCK_MULTISIG_ADDRESS,
          transactionHash: MOCK_TX_HASH_1,
          agentSafe: agentSafeRef,
        }),
        makeFundsMovement({
          id: 'signer',
          category: 'MASTER_TO_AGENT',
          token: null,
          amount: '321980789324419',
          to: MOCK_INSTANCE_ADDRESS,
          transactionHash: MOCK_TX_HASH_1,
          agentSafe: agentSafeRef,
        }),
      ]),
      EvmChainIdMap.Optimism,
    );

    expect(rows).toHaveLength(2);
    const safeRow = rows.find((r) => r.agentInstanceAddress === null)!;
    const signerRow = rows.find((r) => r.agentInstanceAddress !== null)!;
    expect(safeRow.transfers).toEqual([
      { tokenAddress: null, amount: '78019210675581', direction: 'in' },
    ]);
    expect(signerRow.agentInstanceAddress).toBe(MOCK_INSTANCE_ADDRESS);
    expect(signerRow.transfers).toEqual([
      { tokenAddress: null, amount: '321980789324419', direction: 'in' },
    ]);
    expect(safeRow.id).not.toBe(signerRow.id);
  });

  it('matches the Agent Safe case-insensitively when splitting by recipient', () => {
    const rows = buildAgentTransactionHistoryRows(
      resp([
        makeFundsMovement({
          category: 'MASTER_TO_AGENT',
          to: MOCK_MULTISIG_ADDRESS.toUpperCase().replace('0X', '0x'),
          transactionHash: MOCK_TX_HASH_1,
          agentSafe: agentSafeRef,
        }),
      ]),
      EvmChainIdMap.Gnosis,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].agentInstanceAddress).toBeNull();
  });

  it('does not mark the automatic Agent Safe -> Agent Signer top-up with an instance address', () => {
    // Its label comes from the category; the row keeps the 'internal' direction.
    const rows = buildAgentTransactionHistoryRows(
      resp([
        makeFundsMovement({
          category: 'AGENT_SAFE_TO_AGENT_EOA',
          source: 'SEMANTIC',
          token: null,
          from: MOCK_MULTISIG_ADDRESS,
          to: MOCK_INSTANCE_ADDRESS,
          transactionHash: MOCK_TX_HASH_1,
          agentSafe: agentSafeRef,
        }),
      ]),
      EvmChainIdMap.Gnosis,
    );

    expect(rows[0].agentInstanceAddress).toBeNull();
    expect(rows[0].transfers[0].direction).toBe('internal');
  });

  it('groups multi-token movements in one tx + category into a single row', () => {
    const rows = buildAgentTransactionHistoryRows(
      resp([
        makeFundsMovement({
          id: 'a',
          category: 'MASTER_TO_AGENT',
          token: MOCK_USDC_E_TOKEN_ADDRESS,
          amount: '5',
          to: MOCK_MULTISIG_ADDRESS,
          transactionHash: MOCK_TX_HASH_1,
          agentSafe: agentSafeRef,
        }),
        makeFundsMovement({
          id: 'b',
          category: 'MASTER_TO_AGENT',
          token: null,
          amount: '10',
          to: MOCK_MULTISIG_ADDRESS,
          transactionHash: MOCK_TX_HASH_1,
          agentSafe: agentSafeRef,
        }),
      ]),
      EvmChainIdMap.Gnosis,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].transfers).toHaveLength(2);
    expect(rows[0].transfers.every((t) => t.direction === 'in')).toBe(true);
  });

  it('hides OLAS reward sweeps (OLAS AGENT_TO_MASTER) but keeps non-OLAS ones', () => {
    const rows = buildAgentTransactionHistoryRows(
      resp([
        makeFundsMovement({
          id: 'sweep',
          category: 'AGENT_TO_MASTER',
          token: MOCK_OLAS_TOKEN_ADDRESS,
          from: MOCK_MULTISIG_ADDRESS,
          transactionHash: MOCK_TX_HASH_1,
          agentSafe: agentSafeRef,
        }),
        makeFundsMovement({
          id: 'genuine',
          category: 'AGENT_TO_MASTER',
          token: MOCK_USDC_E_TOKEN_ADDRESS,
          from: MOCK_MULTISIG_ADDRESS,
          transactionHash: MOCK_TX_HASH_2,
          agentSafe: agentSafeRef,
        }),
      ]),
      EvmChainIdMap.Gnosis,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].transfers[0].tokenAddress).toBe(MOCK_USDC_E_TOKEN_ADDRESS);
  });

  it('sorts rows by blockTimestamp descending', () => {
    const rows = buildAgentTransactionHistoryRows(
      resp([
        makeFundsMovement({
          category: 'MASTER_TO_AGENT',
          to: MOCK_MULTISIG_ADDRESS,
          transactionHash: MOCK_TX_HASH_1,
          blockTimestamp: '100',
          agentSafe: agentSafeRef,
        }),
        makeFundsMovement({
          category: 'AGENT_TO_MASTER',
          from: MOCK_MULTISIG_ADDRESS,
          token: MOCK_USDC_E_TOKEN_ADDRESS,
          transactionHash: MOCK_TX_HASH_2,
          blockTimestamp: '300',
          agentSafe: agentSafeRef,
        }),
      ]),
      EvmChainIdMap.Gnosis,
    );

    expect(rows.map((r) => r.blockTimestamp)).toEqual([300, 100]);
  });
});
