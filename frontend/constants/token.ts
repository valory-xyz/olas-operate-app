export const TokenSymbolMap = {
  ETH: 'ETH',
  OLAS: 'OLAS',
  USDC: 'USDC',
  XDAI: 'XDAI',
  WXDAI: 'WXDAI',
} as const;

export type TokenSymbol = keyof typeof TokenSymbolMap;

export const TokenSymbolConfigMap: Record<TokenSymbol, { image: string }> = {
  [TokenSymbolMap.ETH]: { image: '/chains/ethereum-chain.png' },
  [TokenSymbolMap.XDAI]: { image: '/chains/gnosis-chain.png' },
  [TokenSymbolMap.OLAS]: { image: '/tokens/olas-icon.png' },
  [TokenSymbolMap.USDC]: { image: '/tokens/usdc-icon.png' },
  [TokenSymbolMap.WXDAI]: { image: '/tokens/wxdai-icon.png' },
} as const;
