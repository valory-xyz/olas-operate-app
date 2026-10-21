import {
  getAgentIconCategory,
  getAgentTransactionRowLabel,
} from '../../../../components/AgentWallet/BalancesAndAssets/agentTransactionLabels';
import {
  FundsCategory,
  TransactionHistoryRow,
} from '../../../../types/TransactionHistory';
import {
  MOCK_MULTISIG_ADDRESS,
  MOCK_TX_HASH_1,
} from '../../../helpers/factories';

const makeRow = (category: FundsCategory): TransactionHistoryRow => ({
  id: 'row-1',
  category,
  blockTimestamp: 1_720_000_000,
  transactionHash: MOCK_TX_HASH_1,
  agentSafeAddress: MOCK_MULTISIG_ADDRESS,
  agentInstanceAddress: null,
  transfers: [],
});

describe('getAgentTransactionRowLabel', () => {
  it('labels MASTER_TO_AGENT as "Fund agent"', () => {
    expect(getAgentTransactionRowLabel(makeRow('MASTER_TO_AGENT'))).toBe(
      'Fund agent',
    );
  });

  it('labels AGENT_TO_MASTER as "Withdrawal"', () => {
    expect(getAgentTransactionRowLabel(makeRow('AGENT_TO_MASTER'))).toBe(
      'Withdrawal',
    );
  });

  it('labels AGENT_SAFE_TO_AGENT_EOA as "Agent Safe to Agent Signer movement"', () => {
    expect(
      getAgentTransactionRowLabel(makeRow('AGENT_SAFE_TO_AGENT_EOA')),
    ).toBe('Agent Safe to Agent Signer movement');
  });

  it('falls back to "Transaction" for other categories', () => {
    expect(getAgentTransactionRowLabel(makeRow('OTHER'))).toBe('Transaction');
  });
});

describe('getAgentIconCategory', () => {
  it('maps MASTER_TO_AGENT to the inflow icon (MASTER_FUNDING_IN)', () => {
    expect(getAgentIconCategory(makeRow('MASTER_TO_AGENT'))).toBe(
      'MASTER_FUNDING_IN',
    );
  });

  it('maps AGENT_TO_MASTER to the outflow icon (MASTER_WITHDRAWAL)', () => {
    expect(getAgentIconCategory(makeRow('AGENT_TO_MASTER'))).toBe(
      'MASTER_WITHDRAWAL',
    );
  });

  it('keeps AGENT_SAFE_TO_AGENT_EOA on its own icon', () => {
    expect(getAgentIconCategory(makeRow('AGENT_SAFE_TO_AGENT_EOA'))).toBe(
      'AGENT_SAFE_TO_AGENT_EOA',
    );
  });

  it('passes through other categories unchanged', () => {
    expect(getAgentIconCategory(makeRow('OTHER'))).toBe('OTHER');
  });
});
