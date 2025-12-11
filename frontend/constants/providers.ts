import { ethers } from 'ethers';
import { Provider as MulticallProvider } from 'ethers-multicall';

import { setupMulticallAddresses } from '@/utils/setupMulticall';

import { CHAIN_CONFIG } from '../config/chains';
import { EvmChainId } from './chains';

type Providers = {
  [evmChainId in EvmChainId]: {
    provider: ethers.providers.JsonRpcProvider;
    multicallProvider: MulticallProvider;
  };
};

// Setup multicall addresses
setupMulticallAddresses();

export const PROVIDERS = Object.entries(CHAIN_CONFIG).reduce(
  (acc, [, { rpc, name, evmChainId }]) => {
    const provider = new ethers.providers.StaticJsonRpcProvider(rpc, {
      name,
      chainId: evmChainId,
    });

    const multicallProvider = new MulticallProvider(provider, evmChainId);

    return {
      ...acc,
      [evmChainId]: {
        provider,
        multicallProvider,
      },
    };
  },
  {} as Providers,
);
