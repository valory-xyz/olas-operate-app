import { useCallback, useEffect, useMemo, useState } from 'react';

import { ACTIVE_AGENTS } from '@/config/agents';
import { CHAIN_CONFIG } from '@/config/chains';
import { AgentType, EvmChainId, PAGES, SETUP_SCREEN } from '@/constants';
import {
  useArchivedAgents,
  usePageState,
  useServices,
  useSetup,
} from '@/hooks';

import { AgentList } from '../Sidebar/AgentListMenu';

/**
 * Manages the agent list (filtered by archive state) and all archive-related
 * state and callbacks for the Sidebar.
 */
export const useSidebarArchive = () => {
  const { goto: gotoSetup } = useSetup();
  const { goto: gotoPage } = usePageState();
  const { services, selectedAgentType, updateAgentType } = useServices();
  const { archiveAgent, archivedAgents } = useArchivedAgents();

  const [pendingArchiveAgent, setPendingArchiveAgent] = useState<
    AgentType | undefined
  >();

  // Optimistic exclusion: immediately hide an agent when archiving is confirmed,
  // before the IPC store-changed response arrives. Cleared once the store catches up.
  const [optimisticArchivedAgents, setOptimisticArchivedAgents] = useState<
    AgentType[]
  >([]);

  useEffect(() => {
    setOptimisticArchivedAgents((prev) =>
      prev.filter((a) => !archivedAgents.includes(a)),
    );
  }, [archivedAgents]);

  const myAgents = useMemo(() => {
    if (!services) return [];
    return services.reduce<AgentList>((result, service) => {
      const agent = ACTIVE_AGENTS.find(
        ([, agentConfig]) =>
          agentConfig.servicePublicId === service.service_public_id &&
          agentConfig.middlewareHomeChainId === service.home_chain,
      );
      if (!agent) return result;

      const [agentType, agentConfig] = agent;
      if (!agentConfig.evmHomeChainId) return result;
      if (
        archivedAgents.includes(agentType) ||
        optimisticArchivedAgents.includes(agentType)
      ) {
        return result;
      }

      const chainId = agentConfig.evmHomeChainId as EvmChainId;
      const chainName = CHAIN_CONFIG[chainId].name;
      const name = agentConfig.displayName;
      result.push({ name, agentType, chainName, chainId });
      return result;
    }, []);
  }, [services, archivedAgents, optimisticArchivedAgents]);

  const handleArchiveConfirm = useCallback(() => {
    if (!pendingArchiveAgent) return;

    // Optimistically hide immediately — before IPC round-trip completes
    setOptimisticArchivedAgents((prev) => [...prev, pendingArchiveAgent]);
    archiveAgent(pendingArchiveAgent);

    // Select next available agent if the archived one was selected
    if (selectedAgentType === pendingArchiveAgent) {
      const nextAgent = myAgents.find(
        (agent) => agent.agentType !== pendingArchiveAgent,
      );
      if (nextAgent) {
        updateAgentType(nextAgent.agentType);
        gotoPage(PAGES.Main);
      } else {
        gotoPage(PAGES.Setup);
        gotoSetup(SETUP_SCREEN.AgentOnboarding);
      }
    }

    setPendingArchiveAgent(undefined);
  }, [
    archiveAgent,
    gotoPage,
    gotoSetup,
    myAgents,
    pendingArchiveAgent,
    selectedAgentType,
    updateAgentType,
  ]);

  const pendingArchiveAgentName = useMemo(() => {
    if (!pendingArchiveAgent) return '';
    const agent = myAgents.find((a) => a.agentType === pendingArchiveAgent);
    return agent?.name ?? '';
  }, [myAgents, pendingArchiveAgent]);

  return {
    myAgents,
    archivedAgents,
    pendingArchiveAgent,
    setPendingArchiveAgent,
    pendingArchiveAgentName,
    handleArchiveConfirm,
  };
};
