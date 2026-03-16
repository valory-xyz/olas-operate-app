import { EvmChainIdMap } from '../../../constants/chains';
import { NA } from '../../../constants/symbols';
import { generateAgentName } from '../../../utils/generateAgentName/generateAgentName';
import { ALL_EVM_CHAIN_IDS } from '../../helpers/factories';

// Access the internal `computeAgentId` module so we can mock it for edge cases
jest.mock('../../../utils/generateAgentName/computeAgentId', () => {
  const actual = jest.requireActual(
    '../../../utils/generateAgentName/computeAgentId',
  );
  return {
    ...actual,
    computeAgentId: jest.fn(actual.computeAgentId),
  };
});

/* eslint-disable @typescript-eslint/no-var-requires */
const {
  computeAgentId,
} = require('../../../utils/generateAgentName/computeAgentId');
/* eslint-enable @typescript-eslint/no-var-requires */

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

  describe('normalizeToSeedHex64 edge cases', () => {
    afterEach(() => {
      computeAgentId.mockRestore?.();
    });

    it('returns NA when computeAgentId returns a non-hex string', () => {
      computeAgentId.mockReturnValueOnce('not-a-hex-string');
      expect(generateAgentName(EvmChainIdMap.Base, 1)).toBe(NA);
    });

    it('returns NA when computeAgentId returns a hex string shorter than 64 chars', () => {
      // 40-char hex (address-length) — not 64 chars
      computeAgentId.mockReturnValueOnce(
        '0x1234567890abcdef1234567890abcdef12345678',
      );
      expect(generateAgentName(EvmChainIdMap.Base, 1)).toBe(NA);
    });

    it('returns NA when computeAgentId returns an empty string', () => {
      computeAgentId.mockReturnValueOnce('');
      expect(generateAgentName(EvmChainIdMap.Base, 1)).toBe(NA);
    });

    it('returns NA when computeAgentId returns undefined', () => {
      computeAgentId.mockReturnValueOnce(undefined);
      expect(generateAgentName(EvmChainIdMap.Base, 1)).toBe(NA);
    });
  });
});
