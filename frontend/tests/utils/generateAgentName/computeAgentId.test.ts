import { EvmChainIdMap } from '../../../constants/chains';
import { computeAgentId } from '../../../utils/generateAgentName/computeAgentId';
import { ALL_EVM_CHAIN_IDS, INVALID_CHAIN_ID } from '../../mocks/factories';

describe('computeAgentId', () => {
  it('returns a bytes32 hex string (66 chars with 0x prefix)', () => {
    const result = computeAgentId(EvmChainIdMap.Gnosis, 1);
    expect(result).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('returns consistent results for same inputs', () => {
    const a = computeAgentId(EvmChainIdMap.Base, 42);
    const b = computeAgentId(EvmChainIdMap.Base, 42);
    expect(a).toBe(b);
  });

  it('returns different results for different token IDs', () => {
    const a = computeAgentId(EvmChainIdMap.Gnosis, 1);
    const b = computeAgentId(EvmChainIdMap.Gnosis, 2);
    expect(a).not.toBe(b);
  });

  it('returns different results for different chain IDs', () => {
    const a = computeAgentId(EvmChainIdMap.Gnosis, 1);
    const b = computeAgentId(EvmChainIdMap.Base, 1);
    expect(a).not.toBe(b);
  });

  it('works for all supported chains', () => {
    for (const chain of ALL_EVM_CHAIN_IDS) {
      expect(() => computeAgentId(chain, 1)).not.toThrow();
    }
  });

  it('throws for unsupported chain ID', () => {
    expect(() => computeAgentId(INVALID_CHAIN_ID, 1)).toThrow(
      'Unsupported chainId 999',
    );
  });
});
