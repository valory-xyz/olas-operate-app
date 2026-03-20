import { useCallback, useMemo, useState } from 'react';

import { ACTIVE_AGENTS, AVAILABLE_FOR_ADDING_AGENTS } from '@/config/agents';
import { PAGES, SETUP_SCREEN } from '@/constants';
import {
  useArchivedAgents,
  usePageState,
  useServices,
  useSetup,
} from '@/hooks';
import { getServiceInstanceName, isServiceOfAgent } from '@/utils';

/**
 * Manages the agent list (filtered by archive state) and all archive-related
 * state and callbacks for the Sidebar.
 *
 * Archiving operates at the serviceConfigId level (individual instances).
 */
export const useSidebarAgents = () => {
  const { goto: gotoSetup } = useSetup();
  const { goto: gotoPage } = usePageState();
  const { services, selectedServiceConfigId, updateSelectedServiceConfigId } =
    useServices();
  const { archivedInstances, archiveInstance } = useArchivedAgents();

  const [pendingArchiveInstanceId, setPendingArchiveInstanceId] = useState<
    string | undefined
  >();

  /** The filtered list of non-archived serviceConfigIds */
  const activeServiceConfigIds = useMemo(() => {
    if (!services) return [];
    return services
      .filter((s) => !archivedInstances.includes(s.service_config_id))
      .map((s) => s.service_config_id);
  }, [services, archivedInstances]);

  const handleArchiveConfirm = useCallback(() => {
    if (!pendingArchiveInstanceId) return;
    if (archivedInstances.includes(pendingArchiveInstanceId)) return;

    archiveInstance(pendingArchiveInstanceId);

    // Select next available instance if the archived one was selected
    if (selectedServiceConfigId === pendingArchiveInstanceId) {
      const nextId = activeServiceConfigIds.find(
        (id) => id !== pendingArchiveInstanceId,
      );
      if (nextId) {
        updateSelectedServiceConfigId(nextId);
        gotoPage(PAGES.Main);
      } else {
        gotoPage(PAGES.Setup);
        gotoSetup(SETUP_SCREEN.AgentOnboarding);
      }
    }

    setPendingArchiveInstanceId(undefined);
  }, [
    activeServiceConfigIds,
    archiveInstance,
    archivedInstances,
    gotoPage,
    gotoSetup,
    pendingArchiveInstanceId,
    selectedServiceConfigId,
    updateSelectedServiceConfigId,
  ]);

  const pendingArchiveInstanceName = useMemo(() => {
    if (!pendingArchiveInstanceId || !services) return '';
    const service = services.find(
      (s) => s.service_config_id === pendingArchiveInstanceId,
    );
    if (!service) return '';
    const agentEntry = ACTIVE_AGENTS.find(([, config]) =>
      isServiceOfAgent(service, config),
    );
    if (!agentEntry) return '';
    const [, config] = agentEntry;
    const instanceName = getServiceInstanceName(
      service,
      config.displayName,
      config.evmHomeChainId,
    );
    return `${instanceName} (${config.displayName})`;
  }, [services, pendingArchiveInstanceId]);

  const canAddNewAgents = useMemo(() => {
    if (archivedInstances.length > 0) return true;
    return activeServiceConfigIds.length < AVAILABLE_FOR_ADDING_AGENTS.length;
  }, [activeServiceConfigIds, archivedInstances]);

  return {
    archivedInstances,
    activeServiceConfigIds,
    canAddNewAgents,
    pendingArchiveInstanceId,
    setPendingArchiveInstanceId,
    pendingArchiveInstanceName,
    handleArchiveConfirm,
  };
};
