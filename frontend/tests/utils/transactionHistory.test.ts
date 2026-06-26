import { EvmChainIdMap } from '../../constants/chains';
import {
  computeIsDataDelayed,
  isOlasAgentToMaster,
} from '../../utils/transactionHistory';
import {
  makeFundsMovement,
  makeSubgraphMeta,
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
