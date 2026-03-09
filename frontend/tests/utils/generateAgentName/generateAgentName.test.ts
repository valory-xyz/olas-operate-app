import { EvmChainIdMap } from '../../../constants/chains';
import { NA } from '../../../constants/symbols';
import { generateAgentName } from '../../../utils/generateAgentName/generateAgentName';
import { ALL_EVM_CHAIN_IDS } from '../../helpers/factories';

describe('generateAgentName', () => {
  it('generates suscus-jelfo63 for Base token 194', () => {
    expect(generateAgentName(EvmChainIdMap.Base, 194)).toBe('suscus-jelfo63');
  });

  it('generates nana-vopar90 for Gnosis token 14', () => {
    expect(generateAgentName(EvmChainIdMap.Gnosis, 14)).toBe('nana-vopar90');
  });

  it('generates gozar-wujan22 for Base token 42', () => {
    expect(generateAgentName(EvmChainIdMap.Base, 42)).toBe('gozar-wujan22');
  });

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
    expect(generateAgentName(EvmChainIdMap.Gnosis, 1)).toBe('tuwim-kakon68');
    expect(generateAgentName(EvmChainIdMap.Base, 1)).toBe('nekto-ramar05');
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
