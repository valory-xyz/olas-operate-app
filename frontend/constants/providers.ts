import { ethers } from 'ethers';
import { Provider } from 'ethers-multicall';

export const provider = new ethers.providers.StaticJsonRpcProvider(
  `${process.env.RPC}`,
  {
    name: 'Gnosis',
    chainId: 100,
  },
);

export const multicallProvider = new Provider(provider, 100);

try {
  multicallProvider.init();
} catch (e) {
  console.error('Error initializing multicall provider', e);
}