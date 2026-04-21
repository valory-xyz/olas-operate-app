import { useCallback } from 'react';

import { EvmChainId } from '@/constants';

import { useArchivedAgents } from './useArchivedAgents';
import { useIsInitiallyFunded } from './useIsInitiallyFunded';
import { useServices } from './useServices';

/**
 * Returns eligibility helpers that filter out ghost services
 * (isInitialFunded === false) and user-archived services from
 * Pearl Wallet funding-need calculations.
 *
 * A service is eligible iff:
 *   1. It maps to a known agent type (not unknown/construction)
 *   2. The user has not archived it
 *   3. The user completed initial funding for it (isInitialFunded === true)
 */
export const useFundingEligibleServices = () => {
  const { getServiceConfigIdsOf, getAgentTypeFromService } = useServices();
  const { isInstanceInitiallyFunded } = useIsInitiallyFunded();
  const { isArchived } = useArchivedAgents();

  const isFundingEligible = useCallback(
    (serviceConfigId: string): boolean => {
      const agentType = getAgentTypeFromService(serviceConfigId);
      if (!agentType) return false;
      if (isArchived(serviceConfigId)) return false;
      if (!isInstanceInitiallyFunded(serviceConfigId, agentType)) return false;
      return true;
    },
    [getAgentTypeFromService, isArchived, isInstanceInitiallyFunded],
  );

  const getFundingEligibleServiceConfigIdsOf = useCallback(
    (chainId: EvmChainId): string[] =>
      getServiceConfigIdsOf(chainId).filter(isFundingEligible),
    [getServiceConfigIdsOf, isFundingEligible],
  );

  return { isFundingEligible, getFundingEligibleServiceConfigIdsOf };
};
