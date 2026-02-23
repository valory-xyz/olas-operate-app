import { isNil } from 'lodash';
import { useMemo } from 'react';

import { AgentType, EvmChainId } from '@/constants';

import { AgentMeta, Eligibility, GeoEligibilityResponse } from '../types';
import {
  getServiceStakingEligibility,
  isAgentsFunAgent,
  isAgentsFunFieldUpdateRequired,
} from '../utils';

export const useEligibilityByAgent = ({
  configuredAgents,
  stakingDetailsQueries,
  stakingContractQueries,
  geoEligibility,
  allowStartAgentByServiceConfigId,
  isBalancesAndFundingRequirementsLoadingForAllServices,
  canCreateSafeForChain,
}: {
  configuredAgents: AgentMeta[];
  stakingDetailsQueries: ReturnType<
    typeof import('./useStakingDetailsQueries').useStakingDetailsQueries
  >;
  stakingContractQueries: ReturnType<
    typeof import('./useStakingContractQueries').useStakingContractQueries
  >;
  geoEligibility?: GeoEligibilityResponse;
  allowStartAgentByServiceConfigId: (serviceConfigId?: string) => boolean;
  isBalancesAndFundingRequirementsLoadingForAllServices: boolean;
  canCreateSafeForChain: (chainId: EvmChainId) => {
    ok: boolean;
    reason?: string;
  };
}) => {
  return useMemo(() => {
    return configuredAgents.reduce<Partial<Record<AgentType, Eligibility>>>(
      (acc, meta, index) => {
        const { agentConfig, agentType, service, chainId, serviceConfigId } =
          meta;

        const stakingDetails = stakingDetailsQueries[index]?.data;
        const contractDetails = stakingContractQueries[index]?.data;

        const {
          isAgentEvicted,
          isEligibleForStaking,
          isServiceStaked,
          hasEnoughServiceSlots,
        } = getServiceStakingEligibility({
          stakingDetails,
          contractDetails,
        });

        const hasSlot = !isNil(hasEnoughServiceSlots) && !hasEnoughServiceSlots;

        const isGeoRestricted =
          agentConfig.isGeoLocationRestricted &&
          geoEligibility?.eligibility?.[agentType]?.status !== 'allowed';

        const allowStart = allowStartAgentByServiceConfigId(serviceConfigId);

        const needsAgentsFunUpdate =
          isAgentsFunAgent(agentType) &&
          isAgentsFunFieldUpdateRequired(service);

        const safeEligibility = canCreateSafeForChain(chainId);

        if (agentConfig.isUnderConstruction) {
          acc[agentType] = { canRun: false, reason: 'Under construction' };
          return acc;
        }

        if (isGeoRestricted) {
          acc[agentType] = { canRun: false, reason: 'Region restricted' };
          return acc;
        }

        if (isAgentEvicted && !isEligibleForStaking) {
          acc[agentType] = { canRun: false, reason: 'Evicted' };
          return acc;
        }

        if (hasSlot && !isServiceStaked) {
          acc[agentType] = { canRun: false, reason: 'No available slots' };
          return acc;
        }

        if (!safeEligibility.ok) {
          acc[agentType] = { canRun: false, reason: safeEligibility.reason };
          return acc;
        }

        if (needsAgentsFunUpdate) {
          acc[agentType] = { canRun: false, reason: 'Update required' };
          return acc;
        }

        if (!allowStart) {
          acc[agentType] = {
            canRun: false,
            reason: isBalancesAndFundingRequirementsLoadingForAllServices
              ? 'Requirements loading'
              : 'Low balance',
          };
          return acc;
        }

        acc[agentType] = {
          canRun: true,
        };
        return acc;
      },
      {},
    );
  }, [
    allowStartAgentByServiceConfigId,
    canCreateSafeForChain,
    configuredAgents,
    geoEligibility,
    isBalancesAndFundingRequirementsLoadingForAllServices,
    stakingContractQueries,
    stakingDetailsQueries,
  ]);
};
