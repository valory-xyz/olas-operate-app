import { useMemo } from 'react';

import { ACTIVE_AGENTS } from '@/config/agents';
import { useService } from '@/hooks/useService';
import { useServices } from '@/hooks/useServices';
import { generateName } from '@/utils/agentName';

export const useWithdraw = () => {
  const { selectedAgentConfig, selectedService } = useServices();
  const { serviceSafes } = useService(selectedService?.service_config_id);

  const evmHomeChainId = selectedAgentConfig?.evmHomeChainId;

  // agent safe
  const serviceSafe = useMemo(() => {
    return serviceSafes?.find(
      ({ evmChainId }) => evmChainId === evmHomeChainId,
    );
  }, [serviceSafes, evmHomeChainId]);

  const agent = ACTIVE_AGENTS.find(
    ([, agentConfig]) =>
      agentConfig.middlewareHomeChainId === selectedService?.home_chain,
  );
  const agentType = agent ? agent[0] : null;

  return {
    middlewareChain: selectedAgentConfig?.middlewareHomeChainId,
    evmHomeChainId,
    agentName: serviceSafe?.address ? generateName(serviceSafe.address) : null,
    agentImgSrc: agentType ? `/agent-${agentType}-icon.png` : null,
  };
};
