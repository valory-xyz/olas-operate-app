import { EvmChainIdMap } from '../../../constants/chains';
import { NA } from '../../../constants/symbols';
import { generateAgentName } from '../../../utils/generateAgentName/generateAgentName';
import { ALL_EVM_CHAIN_IDS } from '../../helpers/factories';

describe('generateAgentName', () => {
  it('returns consistent names for same inputs', () => {
    const firstCall = generateAgentName(EvmChainIdMap.Base, 194);
    const secondCall = generateAgentName(EvmChainIdMap.Base, 194);
    expect(firstCall).toBe(secondCall);
  });

  it('returns different names for different token IDs', () => {
    const nameForToken1 = generateAgentName(EvmChainIdMap.Gnosis, 1);
    const nameForToken2 = generateAgentName(EvmChainIdMap.Gnosis, 2);
    expect(nameForToken1).not.toBe(nameForToken2);
  });

  it('returns different names for different chain IDs', () => {
    const nameForGnosis = generateAgentName(EvmChainIdMap.Gnosis, 1);
    const nameForBase = generateAgentName(EvmChainIdMap.Base, 1);
    expect(nameForGnosis).not.toBe(nameForBase);
  });

  it('returns NA when chainId is nil', () => {
    // @ts-expect-error Testing nil input
    expect(generateAgentName(null, 1)).toBe(NA);
    // @ts-expect-error Testing nil input
    expect(generateAgentName(undefined, 1)).toBe(NA);
  });

  it('returns NA when tokenId is nil', () => {
    // @ts-expect-error Testing nil input
    expect(generateAgentName(EvmChainIdMap.Gnosis, null)).toBe(NA);
    // @ts-expect-error Testing nil input
    expect(generateAgentName(EvmChainIdMap.Gnosis, undefined)).toBe(NA);
  });

  it('generates names for all supported chains', () => {
    for (const chain of ALL_EVM_CHAIN_IDS) {
      const name = generateAgentName(chain, 1);
      expect(name).toMatch(/^[a-z]+-[a-z]+\d{2}$/);
    }
  });
});
