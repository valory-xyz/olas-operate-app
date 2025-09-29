import { useQuery } from '@tanstack/react-query';
import { isNil } from 'lodash';
import { useContext } from 'react';

import { FIVE_SECONDS_INTERVAL } from '@/constants/intervals';
import { REACT_QUERY_KEYS } from '@/constants/react-query-keys';
import { OnlineStatusContext } from '@/context/OnlineStatusProvider';
import { StakingProgramContext } from '@/context/StakingProgramProvider';
import { useServices } from '@/hooks/useServices';
import { StakingRewardsInfoSchema } from '@/types/Autonolas';
import { asMiddlewareChain } from '@/utils/middlewareHelpers';
import { isValidServiceId } from '@/utils/service';

/**
 * hook to fetch staking rewards details of a service
 */
export const useStakingRewardsDetails = () => {
  const { isOnline } = useContext(OnlineStatusContext);
  const { selectedStakingProgramId } = useContext(StakingProgramContext);

  const { selectedService, selectedAgentConfig } = useServices();
  const serviceConfigId = selectedService?.service_config_id;
  const currentChainId = selectedAgentConfig.evmHomeChainId;

  // fetch chain data from the selected service
  const chainData = !isNil(selectedService?.chain_configs)
    ? selectedService?.chain_configs?.[asMiddlewareChain(currentChainId)]
        ?.chain_data
    : null;
  const multisig = chainData?.multisig;
  const token = chainData?.token;

  return useQuery({
    queryKey: REACT_QUERY_KEYS.REWARDS_KEY(
      currentChainId,
      serviceConfigId!,
      selectedStakingProgramId!,
      multisig!,
      token!,
    ),
    queryFn: async () => {
      try {
        const response =
          await selectedAgentConfig.serviceApi.getAgentStakingRewardsInfo({
            agentMultisigAddress: multisig!,
            serviceId: token!,
            stakingProgramId: selectedStakingProgramId!,
            chainId: currentChainId,
          });

        if (!response) return null;

        try {
          const parsed = StakingRewardsInfoSchema.parse(response);
          return parsed;
        } catch (e) {
          console.error('Error parsing staking rewards info', e);
        }
      } catch (e) {
        console.error('Error getting staking rewards info', e);
      }

      return null;
    },
    enabled:
      !!isOnline &&
      !!serviceConfigId &&
      !!selectedStakingProgramId &&
      !!multisig &&
      isValidServiceId(token),
    refetchInterval: isOnline ? FIVE_SECONDS_INTERVAL : false,
    refetchOnWindowFocus: false,
  });
};
