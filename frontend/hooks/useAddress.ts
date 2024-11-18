import { CHAIN_CONFIG } from '@/config/chains';

import { useServices } from './useServices';
import { ChainId } from '@/enums/Chain';

export const useAddress = () => {
  const { service } = useServices();

  /** agent safe multisig address */
  const multisigAddress =
    service?.chain_configs?.[CHAIN_CONFIG[ChainId.Optimism].middlewareChain]?.chain_data?.multisig;

  /** agent instance EOA address */
  const instanceAddress =
    service?.chain_configs?.[CHAIN_CONFIG[ChainId.Optimism].middlewareChain]?.chain_data
      ?.instances?.[0];

  return { instanceAddress, multisigAddress };
};
