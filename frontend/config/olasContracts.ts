import { Contract as MulticallContract } from 'ethers-multicall';

import { SERVICE_REGISTRY_L2_ABI } from '@/abis/serviceRegistryL2';
import { SERVICE_REGISTRY_TOKEN_UTILITY_ABI } from '@/abis/serviceRegistryTokenUtility';
import { STAKING_TOKEN_PROXY_ABI } from '@/abis/stakingTokenProxy';
import { ChainId } from '@/enums/Chain';
import { ContractType } from '@/enums/Contract';

export type ContractsByType = {
  [contractType: string]: MulticallContract;
};

export type ContractsByChain = {
  [chainId: number]: ContractsByType;
};

export const OPTIMISM_OLAS_CONTRACTS: ContractsByType = {
  [ContractType.ServiceRegistryL2]: new MulticallContract(
    '0x3d77596beb0f130a4415df3D2D8232B3d3D31e44',
    SERVICE_REGISTRY_L2_ABI,
  ),
  [ContractType.ServiceRegistryTokenUtility]: new MulticallContract(
    '0xBb7e1D6Cb6F243D6bdE81CE92a9f2aFF7Fbe7eac',
    SERVICE_REGISTRY_TOKEN_UTILITY_ABI,
  ),
  [ContractType.StakingActivity]: new MulticallContract(
    '0x7Fd1F4b764fA41d19fe3f63C85d12bf64d2bbf68',
    STAKING_TOKEN_PROXY_ABI,
  ),
};

export const GNOSIS_OLAS_CONTRACTS: ContractsByType = {
  [ContractType.ServiceRegistryL2]: new MulticallContract(
    '0x9338b5153AE39BB89f50468E608eD9d764B755fD',
    SERVICE_REGISTRY_L2_ABI,
  ),
  [ContractType.ServiceRegistryTokenUtility]: new MulticallContract(
    '0xa45E64d13A30a51b91ae0eb182e88a40e9b18eD8',
    SERVICE_REGISTRY_TOKEN_UTILITY_ABI,
  ),
};

export const OLAS_CONTRACTS: {
  [chainId: number]: ContractsByType;
} = {
  [ChainId.Gnosis]: GNOSIS_OLAS_CONTRACTS,
  [ChainId.Optimism]: OPTIMISM_OLAS_CONTRACTS,
};