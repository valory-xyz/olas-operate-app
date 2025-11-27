export const CONTRACT_TYPE = {
  Multicall3: 'multicall3',
  ServiceRegistryL2: 'serviceRegistryL2',
  ServiceRegistryTokenUtility: 'serviceRegistryTokenUtility',
  StakingTokenProxy: 'stakingTokenProxy',
  AgentMech: 'agentMech',
  MechMarketplace: 'mechMarketplace',
  AgentMechActivity: 'agentMechActivity',
  MechMarketplaceActivity: 'mechMarketplaceActivity',
  StakingActivity: 'stakingActivity',
  Erc20: 'erc20',
  Erc721: 'erc721',
  // Erc1155: 'erc1155',
  // UniswapV2Lp: 'uniswapV2Lp',
  // UniswapV3Lp: 'uniswapV3Lp',
} as const;

export type ContractType = keyof typeof CONTRACT_TYPE;
