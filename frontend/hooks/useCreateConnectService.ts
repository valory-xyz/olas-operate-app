import { useCallback } from 'react';

import { AGENT_CONFIG } from '@/config/agents';
import {
  AgentMap,
  EvmChainId,
  SETUP_SCREEN,
  StakingProgramId,
} from '@/constants';
import { CONNECT_SERVICE_TEMPLATE } from '@/constants/serviceTemplates/service/connect';
import { ServiceTemplate } from '@/types';
import {
  asEvmChainId,
  asMiddlewareChain,
  matchesAgentConfig,
  onDummyServiceCreation,
} from '@/utils';
import { resolveFundingRoute } from '@/utils/fundingRoute';

import { useIsInitiallyFunded } from './useIsInitiallyFunded';
import { useServices } from './useServices';
import { useSetup } from './useSetup';
import { useStakingProgram } from './useStakingProgram';

const NO_STAKING: StakingProgramId = 'no_staking';

/**
 * Build a single-chain Connect service template for the chosen chain: clone
 * CONNECT_SERVICE_TEMPLATE, set `home_chain` to the selected chain and prune
 * `configurations` to just that chain. The staking program (`no_staking`) is
 * applied by `Services.createService`.
 */
const buildSingleChainTemplate = (chainId: EvmChainId): ServiceTemplate => {
  const middlewareChain = asMiddlewareChain(chainId);
  const config = CONNECT_SERVICE_TEMPLATE.configurations[middlewareChain];
  if (!config) {
    throw new Error(`No Connect configuration for chain ${chainId}`);
  }
  return {
    ...CONNECT_SERVICE_TEMPLATE,
    home_chain: middlewareChain,
    configurations: { [middlewareChain]: config },
  };
};

/**
 * Creates a Connect service on the selected chain (connect-gated path — does
 * NOT touch the shared staking-select create), then routes to the appropriate
 * funding screen. Bypasses SelectStaking entirely (Connect uses `no_staking`).
 */
export const useCreateConnectService = () => {
  const { goto: gotoSetup } = useSetup();
  const {
    services,
    refetch: refetchServices,
    updateSelectedServiceConfigId,
  } = useServices();
  const { setDefaultStakingProgramId } = useStakingProgram();
  const { markServiceAsNotInitiallyFunded } = useIsInitiallyFunded();

  return useCallback(
    async (chainId: EvmChainId) => {
      // Select an existing/new Connect service and route to the appropriate
      // funding screen. `resolveFundingRoute` is a network call — if it fails,
      // the service already exists, so fall back to FundYourAgent rather than
      // throwing (throwing would surface a "create failed" error to the caller
      // and tempt the user into creating a duplicate service on retry).
      const selectAndRouteToFunding = async (serviceConfigId: string) => {
        updateSelectedServiceConfigId(serviceConfigId);
        setDefaultStakingProgramId(NO_STAKING);
        try {
          const route = await resolveFundingRoute(serviceConfigId);
          gotoSetup(route);
        } catch (error) {
          console.error(error);
          gotoSetup(SETUP_SCREEN.FundYourAgent);
        }
      };

      // Occupancy guard: Connect is one instance per chain. If the chosen chain
      // already has a Connect instance, never create a second one — select the
      // existing instance and route to funding instead.
      const connectConfig = AGENT_CONFIG[AgentMap.Connect];
      const existing = (services ?? []).find(
        (service) =>
          matchesAgentConfig(service, connectConfig) &&
          asEvmChainId(service.home_chain) === chainId,
      );
      if (existing) {
        await selectAndRouteToFunding(existing.service_config_id);
        return;
      }

      const template = buildSingleChainTemplate(chainId);

      const newService = await onDummyServiceCreation(NO_STAKING, template);
      const newServiceConfigId = newService.service_config_id;

      markServiceAsNotInitiallyFunded(newServiceConfigId);
      await refetchServices?.();
      await selectAndRouteToFunding(newServiceConfigId);
    },
    [
      services,
      refetchServices,
      updateSelectedServiceConfigId,
      setDefaultStakingProgramId,
      markServiceAsNotInitiallyFunded,
      gotoSetup,
    ],
  );
};
