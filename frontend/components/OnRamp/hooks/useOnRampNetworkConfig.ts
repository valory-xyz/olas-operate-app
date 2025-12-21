import { useEffect, useMemo } from 'react';

import { onRampChainMap } from '@/constants';
import { useOnRampContext, useServices } from '@/hooks';
import { asEvmChainDetails, asMiddlewareChain } from '@/utils';

export const useOnRampNetworkConfig = () => {
  const { selectedAgentConfig } = useServices();
  const { updateNetworkConfig } = useOnRampContext();

  const { selectedChainId, networkId, networkName, cryptoCurrencyCode } =
    useMemo(() => {
      const selectedChainId = selectedAgentConfig.evmHomeChainId;
      const fromChainName = asMiddlewareChain(selectedChainId);
      const networkId = onRampChainMap[fromChainName];
      const chainDetails = asEvmChainDetails(asMiddlewareChain(networkId));
      return {
        selectedChainId,
        networkId,
        networkName: chainDetails.name,
        cryptoCurrencyCode: chainDetails.symbol,
      };
    }, [selectedAgentConfig]);

  useEffect(() => {
    updateNetworkConfig({
      networkId,
      networkName,
      cryptoCurrencyCode,
      selectedChainId,
    });
  }, [
    updateNetworkConfig,
    networkId,
    networkName,
    cryptoCurrencyCode,
    selectedChainId,
  ]);

  return { selectedChainId, networkId, networkName, cryptoCurrencyCode };
};
