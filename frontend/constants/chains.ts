export const EvmChainId = {
  Gnosis: 100,
  Base: 8453,
  Mode: 34443,
  Celo: 42220,
  Optimism: 10,
} as const;

export const EvmChainName = {
  [EvmChainId.Gnosis]: 'Gnosis',
  [EvmChainId.Base]: 'Base',
  [EvmChainId.Mode]: 'Mode',
  [EvmChainId.Celo]: 'Celo',
  [EvmChainId.Optimism]: 'Optimism',
} as const;

export const AllEvmChainId = {
  Ethereum: 1,
  Gnosis: EvmChainId.Gnosis,
  Base: EvmChainId.Base,
  Mode: EvmChainId.Mode,
  Celo: EvmChainId.Celo,
  Optimism: EvmChainId.Optimism,
} as const;
