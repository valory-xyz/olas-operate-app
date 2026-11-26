import { useCallback, useMemo } from 'react';

import { AGENT_CONFIG } from '@/config/agents';
import {
  AgentMap,
  EvmChainIdMap,
  MiddlewareDeploymentStatusMap,
  PAGES,
  SETUP_SCREEN,
} from '@/constants';
import { asEvmChainId, matchesAgentConfig } from '@/utils';

import { useElectronApi } from './useElectronApi';
import { useOnboardingSurvey } from './useOnboardingSurvey';
import { usePageState } from './usePageState';
import { useServices } from './useServices';
import { useSetup } from './useSetup';
import { useStore } from './useStore';

/** Where "Stake your Connect Agent" leads: Gnosis first, then Robinhood Chain. */
const STAKING_CHAIN_ORDER = [EvmChainIdMap.Gnosis, EvmChainIdMap.Robinhood];

/**
 * The one-time "Staking for Connect agents" announcement: shown to every user
 * the first time they open a version that ships it, and never again once
 * either button is pressed. It waits for the other first-run modals (the
 * onboarding survey, Connect's first-run modal) rather than covering them.
 */
export const useConnectStakingAnnouncement = () => {
  const { store } = useElectronApi();
  const { storeState } = useStore();
  const { pageState, goto: gotoPage } = usePageState();
  const { goto: gotoSetup } = useSetup();
  const { isModalOpen: isSurveyOpen } = useOnboardingSurvey();
  const {
    services,
    selectedService,
    selectedAgentType,
    updateSelectedServiceConfigId,
  } = useServices();

  const isStoreHydrated = storeState !== undefined;
  const isSeen = storeState?.connectStakingAnnouncementSeen === true;

  // Connect's first-run modal shows on the first run of a selected instance
  // until its flow is completed.
  const isConnectFirstRunPending =
    selectedAgentType === AgentMap.Connect &&
    selectedService?.deploymentStatus ===
      MiddlewareDeploymentStatusMap.DEPLOYED &&
    storeState?.connect?.firstRunCompleted?.[
      selectedService.service_config_id
    ] !== true;

  const isOpen =
    isStoreHydrated &&
    !isSeen &&
    pageState === PAGES.Main &&
    !isSurveyOpen &&
    !isConnectFirstRunPending;

  // The Connect instance whose contract list the button opens, if any.
  const stakeableConnectServiceConfigId = useMemo(() => {
    const connectConfig = AGENT_CONFIG[AgentMap.Connect];
    for (const chainId of STAKING_CHAIN_ORDER) {
      const service = (services ?? []).find(
        (candidate) =>
          matchesAgentConfig(candidate, connectConfig) &&
          asEvmChainId(candidate.home_chain) === chainId,
      );
      if (service) return service.service_config_id;
    }
    return null;
  }, [services]);

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
