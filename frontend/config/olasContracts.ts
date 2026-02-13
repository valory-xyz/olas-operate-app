import { Contract as MulticallContract } from 'ethers-multicall';

import { SERVICE_REGISTRY_L2_ABI } from '@/abis/serviceRegistryL2';
import { SERVICE_REGISTRY_TOKEN_UTILITY_ABI } from '@/abis/serviceRegistryTokenUtility';
import { CONTRACT_TYPE, EvmChainId, EvmChainIdMap } from '@/constants';

type ContractsByType = {
  [contractType: string]: MulticallContract;
};

const GNOSIS_OLAS_CONTRACTS: ContractsByType = {
  [CONTRACT_TYPE.ServiceRegistryL2]: new MulticallContract(
    '0x9338b5153AE39BB89f50468E608eD9d764B755fD',
    SERVICE_REGISTRY_L2_ABI,
  ),
  [CONTRACT_TYPE.ServiceRegistryTokenUtility]: new MulticallContract(
    '0xa45E64d13A30a51b91ae0eb182e88a40e9b18eD8',
    SERVICE_REGISTRY_TOKEN_UTILITY_ABI,
  ),
};

const BASE_OLAS_CONTRACTS: ContractsByType = {
  [CONTRACT_TYPE.ServiceRegistryL2]: new MulticallContract(
    '0x3C1fF68f5aa342D296d4DEe4Bb1cACCA912D95fE',
    SERVICE_REGISTRY_L2_ABI,
  ),
  [CONTRACT_TYPE.ServiceRegistryTokenUtility]: new MulticallContract(
    '0x34C895f302D0b5cf52ec0Edd3945321EB0f83dd5',
    SERVICE_REGISTRY_TOKEN_UTILITY_ABI,
  ),
};

const MODE_OLAS_CONTRACTS: ContractsByType = {
  [CONTRACT_TYPE.ServiceRegistryL2]: new MulticallContract(
    '0x3C1fF68f5aa342D296d4DEe4Bb1cACCA912D95fE',
    SERVICE_REGISTRY_L2_ABI,
  ),
  [CONTRACT_TYPE.ServiceRegistryTokenUtility]: new MulticallContract(
    '0x34C895f302D0b5cf52ec0Edd3945321EB0f83dd5',
    SERVICE_REGISTRY_TOKEN_UTILITY_ABI,
  ),
};

const OPTIMISM_OLAS_CONTRACTS: ContractsByType = {
  [CONTRACT_TYPE.ServiceRegistryL2]: new MulticallContract(
    '0x3d77596beb0f130a4415df3D2D8232B3d3D31e44',
    SERVICE_REGISTRY_L2_ABI,
  ),
  [CONTRACT_TYPE.ServiceRegistryTokenUtility]: new MulticallContract(
    '0xBb7e1D6Cb6F243D6bdE81CE92a9f2aFF7Fbe7eac',
    SERVICE_REGISTRY_TOKEN_UTILITY_ABI,
  ),
};

const POLYGON_OLAS_CONTRACTS: ContractsByType = {
  [CONTRACT_TYPE.ServiceRegistryL2]: new MulticallContract(
    '0xE3607b00E75f6405248323A9417ff6b39B244b50',
    SERVICE_REGISTRY_L2_ABI,
  ),
  [CONTRACT_TYPE.ServiceRegistryTokenUtility]: new MulticallContract(
    '0xa45E64d13A30a51b91ae0eb182e88a40e9b18eD8',
    SERVICE_REGISTRY_TOKEN_UTILITY_ABI,
  ),
};

export const OLAS_CONTRACTS: {
  [evmHomeChainId in EvmChainId]: ContractsByType;
} = {
  [EvmChainIdMap.Gnosis]: GNOSIS_OLAS_CONTRACTS,
  [EvmChainIdMap.Base]: BASE_OLAS_CONTRACTS,
  [EvmChainIdMap.Mode]: MODE_OLAS_CONTRACTS,
  [EvmChainIdMap.Optimism]: OPTIMISM_OLAS_CONTRACTS,
  [EvmChainIdMap.Polygon]: POLYGON_OLAS_CONTRACTS,
};
