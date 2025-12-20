import { useEffect, useMemo } from 'react';

import { onRampChainMap } from '@/constants';
import { useOnRampContext, useServices } from '@/hooks';
import { asEvmChainDetails, asMiddlewareChain } from '@/utils';

export const useOnRampNetworkConfig = () => {
  const { selectedAgentConfig } = useServices();
  const { updateNetworkConfig } = useOnRampContext();

  const { networkId, networkName, cryptoCurrencyCode } = useMemo(() => {
    const fromChainName = asMiddlewareChain(selectedAgentConfig.evmHomeChainId);
    const networkId = onRampChainMap[fromChainName];
    const chainDetails = asEvmChainDetails(asMiddlewareChain(networkId));
    return {
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
    });
  }, [updateNetworkConfig, networkId, networkName, cryptoCurrencyCode]);

  return { networkId, networkName, cryptoCurrencyCode };
};
