import { utils } from 'ethers';

import { OLAS_CONTRACTS } from '../../../config/olasContracts';
import { CONTRACT_TYPE } from '../../../constants';
import { EvmChainId, EvmChainIdMap } from '../../../constants/chains';
import { computeAgentId } from '../../../utils/generateAgentName/computeAgentId';
import { ALL_EVM_CHAIN_IDS, INVALID_CHAIN_ID } from '../../helpers/factories';

describe('computeAgentId', () => {
  it('returns a bytes32 hex string (66 chars with 0x prefix)', () => {
    const result = computeAgentId(EvmChainIdMap.Gnosis, 1);
    expect(result).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('returns consistent results for same inputs', () => {
    const firstCall = computeAgentId(EvmChainIdMap.Base, 42);
    const secondCall = computeAgentId(EvmChainIdMap.Base, 42);
    expect(firstCall).toBe(secondCall);
  });

  it('returns different results for different token IDs', () => {
    const idForToken1 = computeAgentId(EvmChainIdMap.Gnosis, 1);
    const idForToken2 = computeAgentId(EvmChainIdMap.Gnosis, 2);
    expect(idForToken1).not.toBe(idForToken2);
  });

  it('returns different results for different chain IDs', () => {
    const idOnGnosis = computeAgentId(EvmChainIdMap.Gnosis, 1);
    const idOnBase = computeAgentId(EvmChainIdMap.Base, 1);
    expect(idOnGnosis).not.toBe(idOnBase);
  });

  it('works for all supported chains', () => {
    for (const chain of ALL_EVM_CHAIN_IDS) {
      expect(() => computeAgentId(chain, 1)).not.toThrow();
    }
  });

  // Registry addresses from autonomy's CHAIN_PROFILES.
  it.each<[EvmChainId, string]>([
    [EvmChainIdMap.Gnosis, '0x9338b5153AE39BB89f50468E608eD9d764B755fD'],
    [EvmChainIdMap.Base, '0x3C1fF68f5aa342D296d4DEe4Bb1cACCA912D95fE'],
    [EvmChainIdMap.Mode, '0x3C1fF68f5aa342D296d4DEe4Bb1cACCA912D95fE'],
    [EvmChainIdMap.Optimism, '0x3d77596beb0f130a4415df3D2D8232B3d3D31e44'],
    [EvmChainIdMap.Polygon, '0xE3607b00E75f6405248323A9417ff6b39B244b50'],
    [EvmChainIdMap.Robinhood, '0xE3607b00E75f6405248323A9417ff6b39B244b50'],
    [EvmChainIdMap.Arbitrum, '0xE3607b00E75f6405248323A9417ff6b39B244b50'],
    [EvmChainIdMap.Celo, '0xE3607b00E75f6405248323A9417ff6b39B244b50'],
  ])('chain %i hashes with registry %s', (chainId, registry) => {
    const expected = utils.keccak256(
      utils.defaultAbiCoder.encode(
        ['bytes32', 'address', 'uint256'],
        [utils.keccak256(utils.toUtf8Bytes(`eip155:${chainId}`)), registry, 7],
      ),
    );
    expect(computeAgentId(chainId, 7)).toBe(expected);
  });

  it('hashes with the registry the app reads services from', () => {
    for (const chainId of ALL_EVM_CHAIN_IDS) {
      const registry =
        OLAS_CONTRACTS[chainId][CONTRACT_TYPE.ServiceRegistryL2].address;
      const expected = utils.keccak256(
        utils.defaultAbiCoder.encode(
          ['bytes32', 'address', 'uint256'],
          [
            utils.keccak256(utils.toUtf8Bytes(`eip155:${chainId}`)),
            registry,
            3,
          ],
        ),
      );
      expect(computeAgentId(chainId, 3)).toBe(expected);
    }
  });

  it('throws for unsupported chain ID', () => {
    expect(() => computeAgentId(INVALID_CHAIN_ID, 1)).toThrow(
      'Unsupported chainId 999',
    );
  });
});
