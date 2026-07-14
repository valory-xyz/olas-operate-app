import { useCallback } from 'react';

import { EvmChainId, StakingProgramId } from '@/constants';
import { CONNECT_SERVICE_TEMPLATE } from '@/constants/serviceTemplates/service/connect';
import { ServiceTemplate } from '@/types';
import { asMiddlewareChain, onDummyServiceCreation } from '@/utils';
import { resolveFundingRoute } from '@/utils/fundingRoute';

import { useIsInitiallyFunded } from './useIsInitiallyFunded';
import { useServices } from './useServices';
import { useSetup } from './useSetup';
import { useStakingProgram } from './useStakingProgram';

const NO_STAKING: StakingProgramId = 'no_staking';

/**
 * Build a single-chain Connect service template for the chosen chain: clone
 * CONNECT_SERVICE_TEMPLATE, set `home_chain` to the selected chain and prune
 * `configurations` to just that chain. The staking program (`no_staking`) and
 * `use_staking: false` are applied by `Services.createService`.
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
  const { refetch: refetchServices, updateSelectedServiceConfigId } =
    useServices();
  const { setDefaultStakingProgramId } = useStakingProgram();
  const { markServiceAsNotInitiallyFunded } = useIsInitiallyFunded();

  return useCallback(
    async (chainId: EvmChainId) => {
      const template = buildSingleChainTemplate(chainId);

      const newService = await onDummyServiceCreation(NO_STAKING, template);
      const newServiceConfigId = newService.service_config_id;

      markServiceAsNotInitiallyFunded(newServiceConfigId);
      await refetchServices?.();
      updateSelectedServiceConfigId(newServiceConfigId);
      setDefaultStakingProgramId(NO_STAKING);

      const route = await resolveFundingRoute(newServiceConfigId);
      gotoSetup(route);
    },
    [
      refetchServices,
      updateSelectedServiceConfigId,
      setDefaultStakingProgramId,
      markServiceAsNotInitiallyFunded,
      gotoSetup,
    ],
  );
};
