export const TokenSymbol = {
  ETH: 'ETH',
  OLAS: 'OLAS',
  USDC: 'USDC',
  XDAI: 'XDAI',
  CELO: 'CELO',
  WXDAI: 'WXDAI',
} as const;

export type TokenSymbol = (typeof TokenSymbol)[keyof typeof TokenSymbol];

export const TokenSymbolMap: Record<TokenSymbol, { image: string }> = {
  [TokenSymbol.ETH]: { image: '/chains/ethereum-chain.png' },
  [TokenSymbol.OLAS]: { image: '/tokens/olas-icon.png' },
  [TokenSymbol.USDC]: { image: '/tokens/usdc-icon.png' },
  [TokenSymbol.XDAI]: { image: '/chains/gnosis-chain.png' },
  [TokenSymbol.CELO]: { image: '' }, // TODO: Add CELO image
  [TokenSymbol.WXDAI]: { image: '' }, // TODO: Add WXDAI image
};
