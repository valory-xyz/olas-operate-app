import { EvmChainIdMap } from '../../constants/chains';
import {
  computeIsDataDelayed,
  isOlasAgentToMaster,
  normalizeAgentTransactionHistoryResponseV2,
  normalizeFundsMovementV2,
  normalizeTransactionHistoryResponseV2,
} from '../../utils/transactionHistory';
import {
  makeAgentFundingEventV2,
  makeAgentTransactionHistoryResponseV2,
  makeBondMovementV2,
  makeFundsMovement,
  makeFundsMovementV2,
  makeServiceRefV2,
  makeSubgraphMeta,
  makeTransactionHistoryResponseV2,
  MOCK_OLAS_TOKEN_ADDRESS,
  MOCK_USDC_E_TOKEN_ADDRESS,
} from '../helpers/factories';

describe('isOlasAgentToMaster', () => {
  it('flags an OLAS AGENT_TO_MASTER transfer on a known chain', () => {
    expect(
      isOlasAgentToMaster(
        makeFundsMovement({
          category: 'AGENT_TO_MASTER',
          token: MOCK_OLAS_TOKEN_ADDRESS,
        }),
        EvmChainIdMap.Gnosis,
      ),
    ).toBe(true);
  });

  it('does not flag a non-OLAS AGENT_TO_MASTER transfer', () => {
    expect(
      isOlasAgentToMaster(
        makeFundsMovement({
          category: 'AGENT_TO_MASTER',
          token: MOCK_USDC_E_TOKEN_ADDRESS,
        }),
        EvmChainIdMap.Gnosis,
      ),
    ).toBe(false);
  });

  it('does not flag OLAS transfers in other categories', () => {
    expect(
      isOlasAgentToMaster(
        makeFundsMovement({
          category: 'MASTER_TO_AGENT',
          token: MOCK_OLAS_TOKEN_ADDRESS,
        }),
        EvmChainIdMap.Gnosis,
      ),
    ).toBe(false);
  });

  it('returns false when the chain is unknown', () => {
    expect(
      isOlasAgentToMaster(
        makeFundsMovement({
          category: 'AGENT_TO_MASTER',
          token: MOCK_OLAS_TOKEN_ADDRESS,
        }),
        undefined,
      ),
    ).toBe(false);
  });
});

describe('computeIsDataDelayed', () => {
  const nowSeconds = () => Math.floor(Date.now() / 1000);

  it('returns false when meta is null/undefined', () => {
    expect(computeIsDataDelayed(null)).toBe(false);
    expect(computeIsDataDelayed(undefined)).toBe(false);
  });

  it('returns false when the indexed head is recent', () => {
    expect(
      computeIsDataDelayed(
        makeSubgraphMeta({
          block: { number: 1, timestamp: nowSeconds() - 60 },
        }),
      ),
    ).toBe(false);
  });

  it('returns true when the indexed head is ≥12h behind wall-clock', () => {
    expect(
      computeIsDataDelayed(
        makeSubgraphMeta({
          block: { number: 1, timestamp: nowSeconds() - 13 * 3600 },
        }),
      ),
    ).toBe(true);
  });

  it('returns false when the block timestamp is missing', () => {
    expect(
      computeIsDataDelayed(
        makeSubgraphMeta({ block: { number: 1, timestamp: null } }),
      ),
    ).toBe(false);
  });
});

describe('normalizeFundsMovementV2', () => {
  it('maps service refs so domain service.id is the numeric serviceId', () => {
    const normalized = normalizeFundsMovementV2(
      makeFundsMovementV2({
        category: 'MASTER_TO_AGENT',
        agentSafe: {
          id: '0xagentsafe',
          service: makeServiceRefV2({ id: '0x7802', serviceId: '632' }),
        },
        service: makeServiceRefV2({ id: '0x7802', serviceId: '632' }),
      }),
    );

    expect(normalized?.agentSafe?.service?.id).toBe('632');
    expect(normalized?.service?.id).toBe('632');
  });

  it('preserves agentIds and null refs', () => {
    const normalized = normalizeFundsMovementV2(
      makeFundsMovementV2({
        agentSafe: { id: '0xagentsafe', service: null },
      }),
    );

    expect(normalized?.agentSafe).toEqual({ id: '0xagentsafe', service: null });
    expect(normalized?.service).toBeUndefined();
  });

  it('drops AGENT_OLAS_TO_MASTER rows (server-split reward sweeps)', () => {
    expect(
      normalizeFundsMovementV2(
        makeFundsMovementV2({
          category: 'AGENT_OLAS_TO_MASTER',
          token: MOCK_OLAS_TOKEN_ADDRESS,
        }),
      ),
    ).toBeNull();
  });
});

describe('normalizeTransactionHistoryResponseV2', () => {
  it('merges bondMovements into fundsMovements sorted by timestamp desc', () => {
    const normalized = normalizeTransactionHistoryResponseV2(
      makeTransactionHistoryResponseV2({
        fundsMovements: [
          makeFundsMovementV2({ id: 'funding', blockTimestamp: '100' }),
        ],
        bondMovements: [
          makeBondMovementV2({ id: 'bond', blockTimestamp: '200' }),
        ],
      }),
    );

    expect(normalized.fundsMovements.map((m) => m.id)).toEqual([
      'bond',
      'funding',
    ]);
    expect(normalized.fundsMovements[0].bondType).toBe('AGENT_BOND');
    expect(normalized.fundsMovements[0].category).toBe('SERVICE_BOND_DEPOSIT');
  });

  it('normalizes agentFundingEvent transfers and passes through meta/masterSafe', () => {
    const response = makeTransactionHistoryResponseV2({
      agentFundingEvents: [makeAgentFundingEventV2()],
    });

    const normalized = normalizeTransactionHistoryResponseV2(response);

    expect(
      normalized.agentFundingEvents[0].transfers[0].agentSafe?.service?.id,
    ).toBe('42');
    expect(normalized.masterSafe).toEqual(response.masterSafe);
    expect(normalized._meta).toEqual(response._meta);
  });
});

describe('normalizeAgentTransactionHistoryResponseV2', () => {
  it('normalizes rows and drops sweep categories', () => {
    const normalized = normalizeAgentTransactionHistoryResponseV2(
      makeAgentTransactionHistoryResponseV2({
        fundsMovements: [
          makeFundsMovementV2({
            id: 'kept',
            category: 'AGENT_TO_MASTER',
            token: MOCK_USDC_E_TOKEN_ADDRESS,
            service: makeServiceRefV2(),
          }),
          makeFundsMovementV2({
            id: 'dropped',
            category: 'AGENT_OLAS_TO_MASTER',
            token: MOCK_OLAS_TOKEN_ADDRESS,
          }),
        ],
      }),
    );

    expect(normalized.fundsMovements.map((m) => m.id)).toEqual(['kept']);
    expect(normalized.fundsMovements[0].service?.id).toBe('42');
  });
});
