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
  rewardsQueries,
  stakingDetailsQueries,
  stakingContractQueries,
  geoEligibility,
  allowStartAgentByServiceConfigId,
  isBalancesAndFundingRequirementsLoadingForAllServices,
  canCreateSafeForChain,
}: {
  configuredAgents: AgentMeta[];
  rewardsQueries: ReturnType<
    typeof import('./useRewardsQueries').useRewardsQueries
  >;
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

        const rewardsDetails = rewardsQueries[index]?.data;
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

        const isEligibleForRewards = rewardsDetails?.isEligibleForRewards;

        const isGeoRestricted =
          agentConfig.isGeoLocationRestricted &&
          geoEligibility?.eligibility?.[agentType]?.status !== 'allowed';

        const allowStart = allowStartAgentByServiceConfigId(serviceConfigId);

        const needsAgentsFunUpdate =
          isAgentsFunAgent(agentType) &&
          isAgentsFunFieldUpdateRequired(service);

        const safeEligibility = canCreateSafeForChain(chainId);

        if (agentConfig.isUnderConstruction) {
          acc[agentType] = {
            canRun: false,
            reason: 'Under construction',
            isEligibleForRewards,
          };
          return acc;
        }

        if (isGeoRestricted) {
          acc[agentType] = {
            canRun: false,
            reason: 'Region restricted',
            isEligibleForRewards,
          };
          return acc;
        }

        if (isAgentEvicted && !isEligibleForStaking) {
          acc[agentType] = {
            canRun: false,
            reason: 'Evicted',
            isEligibleForRewards,
          };
          return acc;
        }

        if (hasSlot && !isServiceStaked) {
          acc[agentType] = {
            canRun: false,
            reason: 'No available slots',
            isEligibleForRewards,
          };
          return acc;
        }

        if (!safeEligibility.ok) {
          acc[agentType] = {
            canRun: false,
            reason: safeEligibility.reason,
            isEligibleForRewards,
          };
          return acc;
        }

        if (needsAgentsFunUpdate) {
          acc[agentType] = {
            canRun: false,
            reason: 'Update required',
            isEligibleForRewards,
          };
          return acc;
        }

        if (!allowStart) {
          acc[agentType] = {
            canRun: false,
            reason: isBalancesAndFundingRequirementsLoadingForAllServices
              ? 'Requirements loading'
              : 'Low balance',
            isEligibleForRewards,
          };
          return acc;
        }

        acc[agentType] = {
          canRun: true,
          isEligibleForRewards,
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
    rewardsQueries,
    stakingContractQueries,
    stakingDetailsQueries,
  ]);
};
