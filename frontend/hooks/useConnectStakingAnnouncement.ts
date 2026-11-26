import { useCallback, useMemo } from 'react';

import { AGENT_CONFIG } from '@/config/agents';
import {
  AgentMap,
  MiddlewareDeploymentStatusMap,
  PAGES,
  SETUP_SCREEN,
} from '@/constants';
import { asEvmChainId, matchesAgentConfig } from '@/utils';

import { useAchievementPending } from './useAchievementPending';
import { useArchivedAgents } from './useArchivedAgents';
import { isConnectFirstRunComplete } from './useConnectSession';
import { useElectronApi } from './useElectronApi';
import { useOnboardingSurvey } from './useOnboardingSurvey';
import { usePageState } from './usePageState';
import { useServices } from './useServices';
import { useSetup } from './useSetup';
import { useStore } from './useStore';

/**
 * The one-time "Staking for Connect agents" announcement: shown to every user
 * the first time they open a version that ships it, and never again once
 * either button is pressed. It waits for the other first-run modals (the
 * onboarding survey, Connect's first-run modal, an achievement) rather than
 * covering them.
 */
export const useConnectStakingAnnouncement = () => {
  const { store } = useElectronApi();
  const { storeState } = useStore();
  const { pageState, goto: gotoPage } = usePageState();
  const { goto: gotoSetup } = useSetup();
  const { isModalOpen: isSurveyOpen } = useOnboardingSurvey();
  const {
    services,
    isFetched: isServicesFetched,
    selectedService,
    selectedAgentType,
    updateSelectedServiceConfigId,
  } = useServices();
  const { isArchived } = useArchivedAgents();
  const { isAchievementPending } = useAchievementPending();

  const isStoreHydrated = storeState !== undefined;
  const isSeen = storeState?.connectStakingAnnouncementSeen === true;

  // Connect's first-run modal shows on the first run of a selected instance
  // until its flow is completed. Not `showFirstRunModal`, which also waits for
  // the agent's server: this one must not open first and then be covered.
  const isConnectFirstRunPending =
    selectedAgentType === AgentMap.Connect &&
    selectedService?.deploymentStatus ===
      MiddlewareDeploymentStatusMap.DEPLOYED &&
    !isConnectFirstRunComplete(storeState, selectedService.service_config_id);

  const isOpen =
    isStoreHydrated &&
    !isSeen &&
    pageState === PAGES.Main &&
    !isSurveyOpen &&
    // until the services load, a pending Connect first run cannot be ruled out
    !!isServicesFetched &&
    !isConnectFirstRunPending &&
    !isAchievementPending;

  // The Connect instance whose contract list the button opens, if any: in
  // `stakingChains` order, Gnosis first.
  const stakeableConnectServiceConfigId = useMemo(() => {
    const connectConfig = AGENT_CONFIG[AgentMap.Connect];
    for (const chainId of connectConfig.stakingChains ?? []) {
      const service = (services ?? []).find(
        (candidate) =>
          matchesAgentConfig(candidate, connectConfig) &&
          asEvmChainId(candidate.home_chain) === chainId &&
          !isArchived(candidate.service_config_id),
      );
      if (service) return service.service_config_id;
    }
    return null;
  }, [services, isArchived]);

  const markSeen = useCallback(() => {
    store?.set?.('connectStakingAnnouncementSeen', true);
  }, [store]);

  const stake = useCallback(() => {
    markSeen();
    if (stakeableConnectServiceConfigId) {
      updateSelectedServiceConfigId(stakeableConnectServiceConfigId);
      gotoPage(PAGES.SelectStaking);
      return;
    }
    // No Connect agent on a chain that can stake (none, or only on Polygon):
    // agent creation, with no chain preselected.
    gotoPage(PAGES.Setup);
    gotoSetup(SETUP_SCREEN.AgentOnboarding);
  }, [
    markSeen,
    stakeableConnectServiceConfigId,
    updateSelectedServiceConfigId,
    gotoPage,
    gotoSetup,
  ]);

  return { isOpen, stake, dismiss: markSeen };
};
