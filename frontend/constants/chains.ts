export const CHAINS: {
  [chain: string]: {
    name: string;
    currency: string;
    chainId: number;
  };
} = {
  GNOSIS: { name: 'Gnosis', currency: 'XDAI', chainId: 100 },
  OPTIMISM: { name: 'Optimism', currency: 'ETH', chainId: 10 },
};
