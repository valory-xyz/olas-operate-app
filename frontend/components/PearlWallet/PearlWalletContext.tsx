import { createContext, ReactNode, useContext, useMemo } from 'react';

import { ACTIVE_AGENTS } from '@/config/agents';
import { useService } from '@/hooks/useService';
import { useServices } from '@/hooks/useServices';
import { generateName } from '@/utils/agentName';

import { AvailableAsset, StakedAsset } from './Withdraw/types';

const PearlWalletContext = createContext<{
  availableAssets: AvailableAsset[];
  stakedAssets: StakedAsset[];
}>({
  stakedAssets: [],
  availableAssets: [],
});

export const PearlWalletProvider = ({ children }: { children: ReactNode }) => {
  const { selectedAgentConfig, selectedService } = useServices();
  const { serviceSafes } = useService(selectedService?.service_config_id);

  const evmHomeChainId = selectedAgentConfig?.evmHomeChainId;
  const agent = ACTIVE_AGENTS.find(
    ([, agentConfig]) =>
      agentConfig.middlewareHomeChainId === selectedService?.home_chain,
  );
  const agentType = agent ? agent[0] : null;

  // agent safe
  const serviceSafe = useMemo(() => {
    return serviceSafes?.find(
      ({ evmChainId }) => evmChainId === evmHomeChainId,
    );
  }, [serviceSafes, evmHomeChainId]);

  const availableAssets: AvailableAsset[] = [
    {
      symbol: 'ETH',
      amount: 2.5,
      value: 4000,
    },
    {
      symbol: 'XDAI',
      amount: 1500,
      value: 1500,
    },
  ];

  const agentName = serviceSafe?.address
    ? generateName(serviceSafe.address)
    : null;
  const agentImgSrc = agentType ? `/agent-${agentType}-icon.png` : null;

  const stakedAssets: StakedAsset[] = [
    {
      agentName,
      agentImgSrc,
      symbol: 'OLAS',
      amount: 5000,
      value: 4000,
    },
  ];

  return (
    <PearlWalletContext.Provider value={{ availableAssets, stakedAssets }}>
      {children}
    </PearlWalletContext.Provider>
  );
};

export const usePearlWallet = () => {
  const { availableAssets, stakedAssets } = useContext(PearlWalletContext);
  const { selectedAgentConfig } = useServices();

  const evmHomeChainId = selectedAgentConfig?.evmHomeChainId;

  return {
    isLoading: false, // TODO: add loading state if needed
    availableAssets,
    stakedAssets,
    aggregatedBalance: null, // TODO: fetch real aggregated balance

    // TODO: unused yet, remove if not needed
    middlewareChain: selectedAgentConfig?.middlewareHomeChainId,
    evmHomeChainId,
  };
};
