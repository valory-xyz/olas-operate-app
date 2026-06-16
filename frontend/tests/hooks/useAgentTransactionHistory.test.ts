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

  it('marks a MASTER_TO_AGENT leg that lands on the Agent EOA as inbound', () => {
    // Regression for the address-based direction bug: gas top-ups fund the
    // Agent EOA (not the Safe) but still carry the agentSafe ref, so the query
    // returns them. Direction is by category, so this must read as inbound.
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
