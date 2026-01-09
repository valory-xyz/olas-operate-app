import { setMulticallAddress } from 'ethers-multicall';

import { EvmChainId, EvmChainIdMap } from '@/constants';
import { Address } from '@/types/Address';

const DEFAULT_MULTICALL_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11';

type AddressesForAllChainIds = {
  [chainId in EvmChainId]: Address;
};

const addresses: AddressesForAllChainIds = {
  [EvmChainIdMap.Base]: DEFAULT_MULTICALL_ADDRESS,
  [EvmChainIdMap.Gnosis]: DEFAULT_MULTICALL_ADDRESS,
  [EvmChainIdMap.Mode]: DEFAULT_MULTICALL_ADDRESS,
  [EvmChainIdMap.Optimism]: DEFAULT_MULTICALL_ADDRESS,
  [EvmChainIdMap.Polygon]: DEFAULT_MULTICALL_ADDRESS,
};

/**
 * Override multicall address in ethers-multicall
 * throws error if the address is not set for a given `ChainId`
 */
export const setupMulticallAddresses = async () => {
  Object.entries(addresses).forEach(([chainId, address]) => {
    if (!address) {
      throw new Error(`Multicall address not set for chainId: ${chainId}`);
    }
    setMulticallAddress(+chainId as EvmChainId, address);
  });
};
