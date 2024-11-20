import { ethers } from 'ethers';
import { Provider as MulticallProvider } from 'ethers-multicall';

import { CHAIN_CONFIG } from '../config/chains';

type Providers = {
  [chainIdKey in keyof typeof CHAIN_CONFIG]: {
    provider: ethers.providers.JsonRpcProvider;
    multicallProvider: MulticallProvider;
  };
};

export const PROVIDERS = Object.entries(CHAIN_CONFIG).reduce(
  (acc, [chainConfigKey, { rpc, name, chainId }]) => {
    const provider = new ethers.providers.JsonRpcProvider(rpc, {
      name,
      chainId,
    });
    const multicallProvider = new MulticallProvider(provider, chainId);

    return {
      ...acc,
      [chainConfigKey]: {
        provider,
        multicallProvider,
      },
    };
  },
  {} as Providers,
);
