export enum EvmChainId {
  Ethereum = 1,
  Optimism = 10,
  Gnosis = 100,
  Base = 8453,
  Mode = 34443,
}

export const EvmChainName = {
  [EvmChainId.Ethereum]: 'Ethereum',
  [EvmChainId.Optimism]: 'Optimism',
  [EvmChainId.Gnosis]: 'Gnosis',
  [EvmChainId.Base]: 'Base',
  [EvmChainId.Mode]: 'Mode',
};
