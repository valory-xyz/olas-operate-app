import { getTransactionRowLabel } from '../../../../components/PearlWallet/History/labels';
import { Address } from '../../../../types/Address';
import {
  FundsCategory,
  TransactionHistoryRow,
} from '../../../../types/TransactionHistory';
import {
  MOCK_INSTANCE_ADDRESS,
  MOCK_MULTISIG_ADDRESS,
  MOCK_TX_HASH_1,
} from '../../../helpers/factories';

const makeRow = (
  overrides: Partial<TransactionHistoryRow> = {},
): TransactionHistoryRow => ({
  id: 'row-1',
  category: 'MASTER_FUNDING_IN',
  blockTimestamp: 1_720_000_000,
  transactionHash: MOCK_TX_HASH_1,
  agentSafeAddress: MOCK_MULTISIG_ADDRESS,
  agentInstanceAddress: null,
  transfers: [],
  ...overrides,
});

describe('getTransactionRowLabel', () => {
  const fixed: Array<[FundsCategory, string]> = [
    ['SAFE_DEPLOYED', 'Setup complete'],
    ['SAFE_SETUP_TRANSFER', 'Setup complete'],
    ['OPENING_BALANCE', 'Opening balance'],
    ['MASTER_FUNDING_IN', 'Deposit'],
    ['MASTER_WITHDRAWAL', 'Withdraw to external wallet'],
  ];

  it.each(fixed)(
    'returns the fixed label for %s',
    (category: FundsCategory, expected: string) => {
      expect(getTransactionRowLabel(makeRow({ category }), 'Omenstrat')).toBe(
        expected,
      );
    },
  );

  it('appends the agent display name to AGENT_TO_MASTER', () => {
    const label = getTransactionRowLabel(
      makeRow({ category: 'AGENT_TO_MASTER' }),
      'Omenstrat',
    );
    expect(label).toBe('Omenstrat withdrawal');
  });

  it('appends the agent display name to SERVICE_BOND_DEPOSIT and SERVICE_BOND_REFUND', () => {
    expect(
      getTransactionRowLabel(
        makeRow({ category: 'SERVICE_BOND_DEPOSIT' }),
        'Omenstrat',
      ),
    ).toBe('Omenstrat stake');
    expect(
      getTransactionRowLabel(
        makeRow({ category: 'SERVICE_BOND_REFUND' }),
        'Omenstrat',
      ),
    ).toBe('Omenstrat unstake');
  });

  it('still labels legacy UNSTAKE_REWARD as "<agent> unstake" for forward-compat', () => {
    expect(
      getTransactionRowLabel(
        makeRow({ category: 'UNSTAKE_REWARD' }),
        'Omenstrat',
      ),
    ).toBe('Omenstrat unstake');
  });

  it('falls back to "Agent" when display name is missing', () => {
    expect(
      getTransactionRowLabel(
        makeRow({ category: 'SERVICE_BOND_DEPOSIT' }),
        null,
      ),
    ).toBe('Agent stake');
  });

  it('labels MASTER_TO_AGENT to Agent Safe as "Fund <agent>"', () => {
    const label = getTransactionRowLabel(
      makeRow({
        category: 'MASTER_TO_AGENT',
        agentInstanceAddress: null,
      }),
      'Polystrat',
    );
    expect(label).toBe('Fund Polystrat');
  });

  it('labels MASTER_TO_AGENT to Agent EOA as "Allocated for execution costs"', () => {
    const label = getTransactionRowLabel(
      makeRow({
        category: 'MASTER_TO_AGENT',
        agentInstanceAddress: MOCK_INSTANCE_ADDRESS as Address,
      }),
      'Polystrat',
    );
    expect(label).toBe('Allocated for execution costs');
  });
});
