/**
 * Tests for OLAS contract configuration.
 *
 * `OLAS_CONTRACTS` maps each chain to its ServiceRegistryL2 and
 * ServiceRegistryTokenUtility contracts. These are used for multicall
 * queries to check staking state, bond balances, and service NFT ownership.
 * Wrong contract addresses silently return empty results, making staking
 * appear broken.
 */

import { OLAS_CONTRACTS } from '../../config/olasContracts';
import { EvmChainIdMap } from '../../constants/chains';
import { CONTRACT_TYPE } from '../../constants/contract';

jest.mock(
  'ethers-multicall',
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../mocks/ethersMulticall').ethersMulticallMock,
);

describe('OLAS_CONTRACTS', () => {
  it('has entries for all 5 supported EVM chains', () => {
    for (const chainId of Object.values(EvmChainIdMap)) {
      expect(OLAS_CONTRACTS[chainId]).toBeDefined();
    }
  });

  it('covers exactly 5 chains', () => {
    expect(Object.keys(OLAS_CONTRACTS)).toHaveLength(5);
  });

  it('every chain has a ServiceRegistryL2 contract', () => {
    for (const chainId of Object.values(EvmChainIdMap)) {
      expect(
        OLAS_CONTRACTS[chainId][CONTRACT_TYPE.ServiceRegistryL2],
      ).toBeDefined();
    }
  });

  it('every chain has a ServiceRegistryTokenUtility contract', () => {
    for (const chainId of Object.values(EvmChainIdMap)) {
      expect(
        OLAS_CONTRACTS[chainId][CONTRACT_TYPE.ServiceRegistryTokenUtility],
      ).toBeDefined();
    }
  });

  describe('contract instances are created for each chain', () => {
    it('Gnosis contracts are defined', () => {
      expect(
        OLAS_CONTRACTS[EvmChainIdMap.Gnosis][CONTRACT_TYPE.ServiceRegistryL2],
      ).toBeDefined();
      expect(
        OLAS_CONTRACTS[EvmChainIdMap.Gnosis][
          CONTRACT_TYPE.ServiceRegistryTokenUtility
        ],
      ).toBeDefined();
    });

    it('Base contracts are defined', () => {
      expect(
        OLAS_CONTRACTS[EvmChainIdMap.Base][CONTRACT_TYPE.ServiceRegistryL2],
      ).toBeDefined();
      expect(
        OLAS_CONTRACTS[EvmChainIdMap.Base][
          CONTRACT_TYPE.ServiceRegistryTokenUtility
        ],
      ).toBeDefined();
    });

    it('Mode contracts are defined', () => {
      expect(
        OLAS_CONTRACTS[EvmChainIdMap.Mode][CONTRACT_TYPE.ServiceRegistryL2],
      ).toBeDefined();
      expect(
        OLAS_CONTRACTS[EvmChainIdMap.Mode][
          CONTRACT_TYPE.ServiceRegistryTokenUtility
        ],
      ).toBeDefined();
    });

    it('Optimism contracts are defined', () => {
      expect(
        OLAS_CONTRACTS[EvmChainIdMap.Optimism][CONTRACT_TYPE.ServiceRegistryL2],
      ).toBeDefined();
      expect(
        OLAS_CONTRACTS[EvmChainIdMap.Optimism][
          CONTRACT_TYPE.ServiceRegistryTokenUtility
        ],
      ).toBeDefined();
    });

    it('Polygon contracts are defined', () => {
      expect(
        OLAS_CONTRACTS[EvmChainIdMap.Polygon][CONTRACT_TYPE.ServiceRegistryL2],
      ).toBeDefined();
      expect(
        OLAS_CONTRACTS[EvmChainIdMap.Polygon][
          CONTRACT_TYPE.ServiceRegistryTokenUtility
        ],
      ).toBeDefined();
    });
  });

  it('the MockMulticallContract constructor was called with the correct address for Gnosis ServiceRegistryL2', () => {
    // The mock records all `new Contract(address, abi)` calls.
    // We verify the Gnosis ServiceRegistry address is correct.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { mockMulticallContract } = require('../mocks/ethersMulticall');
    const allAddresses: string[] = mockMulticallContract.mock.calls.map(
      (call: [string, unknown]) => call[0],
    );
    expect(allAddresses).toContain(
      '0x9338b5153AE39BB89f50468E608eD9d764B755fD',
    );
  });

  it('the MockMulticallContract constructor was called with the correct address for Polygon ServiceRegistryL2', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { mockMulticallContract } = require('../mocks/ethersMulticall');
    const allAddresses: string[] = mockMulticallContract.mock.calls.map(
      (call: [string, unknown]) => call[0],
    );
    expect(allAddresses).toContain(
      '0xE3607b00E75f6405248323A9417ff6b39B244b50',
    );
  });
});
