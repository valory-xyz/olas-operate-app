import {
  AgentTransactionHistoryResponseSchema,
  AgentTransactionHistoryResponseV2Schema,
  TransactionHistoryResponseSchema,
  TransactionHistoryResponseV2Schema,
} from '../../types/TransactionHistory';
import {
  makeAgentFundingEvent,
  makeAgentFundingEventV2,
  makeAgentTransactionHistoryResponseV2,
  makeFundsMovement,
  makeFundsMovementV2,
  makeServiceRefV2,
  makeSubgraphMeta,
  makeTransactionHistoryResponse,
  makeTransactionHistoryResponseV2,
  MOCK_INSTANCE_ADDRESS,
  MOCK_MULTISIG_ADDRESS,
} from '../helpers/factories';

// The Agent Safe → Agent EOA native top-up row the indexers emit (OPE-1965).
// The app must parse it before either indexer ships it: Zod rejects unknown
// enum values, and the Pearl Wallet's agentFundingEvents transfers are not
// filtered by category.
const topUp = makeFundsMovement({
  category: 'AGENT_SAFE_TO_AGENT_EOA',
  source: 'SEMANTIC',
  token: null,
  from: MOCK_MULTISIG_ADDRESS,
  to: MOCK_INSTANCE_ADDRESS,
  agentSafe: { id: MOCK_MULTISIG_ADDRESS, service: null },
});

const topUpV2 = makeFundsMovementV2({
  category: 'AGENT_SAFE_TO_AGENT_EOA',
  source: 'SEMANTIC',
  token: null,
  from: MOCK_MULTISIG_ADDRESS,
  to: MOCK_INSTANCE_ADDRESS,
  agentSafe: { id: MOCK_MULTISIG_ADDRESS, service: makeServiceRefV2() },
});

describe('AGENT_SAFE_TO_AGENT_EOA category parsing', () => {
  it('v1: the agent history schema accepts the category', () => {
    const parsed = AgentTransactionHistoryResponseSchema.parse({
      fundsMovements: [topUp],
      _meta: makeSubgraphMeta(),
    });
    expect(parsed.fundsMovements[0].category).toBe('AGENT_SAFE_TO_AGENT_EOA');
  });

  it('v1: the master history schema accepts it in fundsMovements and funding-event transfers', () => {
    expect(() =>
      TransactionHistoryResponseSchema.parse(
        makeTransactionHistoryResponse({
          fundsMovements: [topUp],
          agentFundingEvents: [makeAgentFundingEvent({ transfers: [topUp] })],
        }),
      ),
    ).not.toThrow();
  });

  it('v2/sqd: the agent history schema accepts the category', () => {
    const parsed = AgentTransactionHistoryResponseV2Schema.parse(
      makeAgentTransactionHistoryResponseV2({ fundsMovements: [topUpV2] }),
    );
    expect(parsed.fundsMovements[0].category).toBe('AGENT_SAFE_TO_AGENT_EOA');
  });

  it('v2/sqd: the master history schema accepts it in fundsMovements and funding-event transfers', () => {
    expect(() =>
      TransactionHistoryResponseV2Schema.parse(
        makeTransactionHistoryResponseV2({
          fundsMovements: [topUpV2],
          agentFundingEvents: [
            makeAgentFundingEventV2({ transfers: [topUpV2] }),
          ],
        }),
      ),
    ).not.toThrow();
  });

  it('still rejects an unknown category', () => {
    expect(() =>
      AgentTransactionHistoryResponseSchema.parse({
        fundsMovements: [{ ...topUp, category: 'NOT_A_CATEGORY' }],
        _meta: makeSubgraphMeta(),
      }),
    ).toThrow();
  });
});
