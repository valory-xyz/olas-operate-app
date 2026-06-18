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

  it('passes through other categories unchanged', () => {
    expect(getAgentIconCategory(makeRow('OTHER'))).toBe('OTHER');
  });
});
