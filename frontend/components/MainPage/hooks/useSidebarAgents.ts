import { useCallback, useEffect, useMemo, useState } from 'react';

import { ACTIVE_AGENTS, AVAILABLE_FOR_ADDING_AGENTS } from '@/config/agents';
import { CHAIN_CONFIG } from '@/config/chains';
import { AgentType, EvmChainId, PAGES, SETUP_SCREEN } from '@/constants';
import {
  useElectronApi,
  usePageState,
  useServices,
  useSetup,
  useStore,
} from '@/hooks';

import { AgentList } from '../Sidebar/AgentListMenu';

/**
 * Manages the agent list (filtered by archive state) and all archive-related
 * state and callbacks for the Sidebar.
 */
export const useSidebarAgents = () => {
  const { goto: gotoSetup } = useSetup();
  const { goto: gotoPage } = usePageState();
  const { services, selectedAgentType, updateAgentType } = useServices();
  const { store } = useElectronApi();
  const { storeState } = useStore();

  const [archivedAgents, setArchivedAgents] = useState<AgentType[]>(
    storeState?.archivedAgents ?? [],
  );

  // Always sync from store so external writes (e.g. unarchiveAgent) are reflected.
  // handleArchiveConfirm also calls setArchivedAgents immediately for instant hide.
  useEffect(() => {
    setArchivedAgents(storeState?.archivedAgents ?? []);
  }, [storeState?.archivedAgents]);

  const [pendingArchiveAgent, setPendingArchiveAgent] = useState<
    AgentType | undefined
  >();

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
      if (archivedAgents.includes(agentType)) return result;

      const chainId = agentConfig.evmHomeChainId as EvmChainId;
      const chainName = CHAIN_CONFIG[chainId].name;
      const name = agentConfig.displayName;
      result.push({ name, agentType, chainName, chainId });
      return result;
    }, []);
  }, [services, archivedAgents]);

  const handleArchiveConfirm = useCallback(() => {
    if (!pendingArchiveAgent) return;
    if (archivedAgents.includes(pendingArchiveAgent)) return;

    const updated = [...archivedAgents, pendingArchiveAgent];
    setArchivedAgents(updated);
    store?.set?.('archivedAgents', updated);

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
    archivedAgents,
    gotoPage,
    gotoSetup,
    myAgents,
    pendingArchiveAgent,
    selectedAgentType,
    store,
    updateAgentType,
  ]);

  const pendingArchiveAgentName = useMemo(() => {
    if (!pendingArchiveAgent) return '';
    const agent = myAgents.find((a) => a.agentType === pendingArchiveAgent);
    return agent?.name ?? '';
  }, [myAgents, pendingArchiveAgent]);

  const canAddNewAgents = useMemo(() => {
    if (archivedAgents.length > 0) return true;
    const availableAgents = myAgents.filter((agent) =>
      AVAILABLE_FOR_ADDING_AGENTS.some(
        ([agentType]) => agentType === agent.agentType,
      ),
    );
    return availableAgents.length < AVAILABLE_FOR_ADDING_AGENTS.length;
  }, [myAgents, archivedAgents]);

  return {
    myAgents,
    archivedAgents,
    canAddNewAgents,
    pendingArchiveAgent,
    setPendingArchiveAgent,
    pendingArchiveAgentName,
    handleArchiveConfirm,
  };
};
