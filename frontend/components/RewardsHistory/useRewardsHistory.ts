import { useQuery } from '@tanstack/react-query';
import { ethers } from 'ethers';
import { gql, request } from 'graphql-request';
import { groupBy } from 'lodash';
import { useCallback, useMemo } from 'react';
import { z } from 'zod';

import { Chain } from '@/client';
import { SERVICE_STAKING_TOKEN_MECH_USAGE_CONTRACT_ADDRESSES } from '@/constants/contractAddresses';
import { STAKING_PROGRAM_META } from '@/constants/stakingProgramMeta';
import { StakingProgramId } from '@/enums/StakingProgram';
import { useServices } from '@/hooks/useServices';

import { EpochDetails, StakingRewardSchema } from './types';

const ONE_DAY = 24 * 60 * 60 * 1000;

const RewardHistoryResponseSchema = z.object({
  epoch: z.string(),
  rewards: z.array(z.string()),
  serviceIds: z.array(z.string()),
  blockTimestamp: z.string(),
  transactionHash: z.string(),
  epochLength: z.string(),
});
type RewardHistoryResponse = z.infer<typeof RewardHistoryResponseSchema>;

const ServiceStakedInfoSchema = z.object({
  blockTimestamp: z.string(),
  epoch: z.string(),
  owner: z.string(),
});
type ServiceStakedInfo = z.infer<typeof ServiceStakedInfoSchema>;

const betaAddress =
  SERVICE_STAKING_TOKEN_MECH_USAGE_CONTRACT_ADDRESSES[Chain.GNOSIS].pearl_beta;
const beta2Address =
  SERVICE_STAKING_TOKEN_MECH_USAGE_CONTRACT_ADDRESSES[Chain.GNOSIS]
    .pearl_beta_2;

const SUBGRAPH_URL =
  'https://api.studio.thegraph.com/query/81855/pearl-staking-rewards-history/version/latest';

const useGetServiceStakedInfo = () => {
  const { serviceId } = useServices();
  const query = useMemo(() => {
    return gql`
      {
        serviceStakeds(orderBy: epoch, where: { serviceId: "${serviceId}" }, first: 1) {
          blockTimestamp
          epoch
          owner
        }
      }
    `;
  }, [serviceId]);

  const { data, isError, isLoading, refetch } = useQuery({
    queryKey: ['serviceStakedInfo', serviceId],
    async queryFn() {
      const serviceStakedInfo = await request(SUBGRAPH_URL, query);
      return serviceStakedInfo as { serviceStakeds: ServiceStakedInfo[] };
    },
    select: (data) => {
      const firstServiceStakedInfo = data.serviceStakeds[0];
      return ServiceStakedInfoSchema.parse(firstServiceStakedInfo);
    },
    refetchOnWindowFocus: false,
    refetchInterval: ONE_DAY,
    enabled: !!serviceId,
  });

  const serviceStakedInfo = useMemo(() => {
    return {
      [StakingProgramId.Beta2]: {
        timestamp: null, // not yet switched from this contract
      },
      [StakingProgramId.Beta]: {
        timestamp: data?.blockTimestamp ? Number(data.blockTimestamp) : null,
      },
    };
  }, [data]);

  return { isError, isLoading, refetch, serviceStakedInfo };
};

const fetchRewardsQuery = gql`
  {
    allRewards: checkpoints(orderBy: epoch, orderDirection: desc) {
      blockTimestamp
      availableRewards
      epoch
      epochLength
      id
      rewards
      serviceIds
      transactionHash
      contractAddress
    }
  }
`;

const transformRewards = (
  rewards: RewardHistoryResponse[],
  serviceId?: number,
  timestampToIgnore?: null | number,
) => {
  if (!rewards || rewards.length === 0) return [];
  if (!serviceId) return [];

  return rewards
    .map((currentReward: RewardHistoryResponse, index: number) => {
      const {
        epoch,
        rewards: aggregatedServiceRewards,
        serviceIds,
        epochLength,
        blockTimestamp,
        transactionHash,
      } = RewardHistoryResponseSchema.parse(currentReward);
      const serviceIdIndex = serviceIds.findIndex(
        (id) => Number(id) === serviceId,
      );
      const reward =
        serviceIdIndex === -1 ? 0 : aggregatedServiceRewards[serviceIdIndex];

      // If the epoch is 0, it means it's the first epoch else,
      // the start time of the epoch is the end time of the previous epoch
      const epochStartTimeStamp =
        epoch === '0'
          ? Number(blockTimestamp) - Number(epochLength)
          : rewards[index + 1].blockTimestamp;

      return {
        epochEndTimeStamp: Number(blockTimestamp),
        epochStartTimeStamp: Number(epochStartTimeStamp),
        reward: Number(ethers.utils.formatUnits(reward, 18)),
        earned: serviceIdIndex !== -1,
        transactionHash,
      } as EpochDetails;
    })
    .filter((epoch) => {
      // If the contract has been switched to new contract, ignore the rewards from the old contract of the same epoch,
      // as the rewards are already accounted in the new contract.
      // example: If contract was switched on September 1st, 2024, ignore the rewards before that date
      // till the user staked in the contract.
      if (timestampToIgnore) {
        return epoch.epochEndTimeStamp < timestampToIgnore;
      }
      return true;
    });
};

export const useRewardsHistory = () => {
  const {
    serviceStakedInfo,
    isLoading: isServiceInfoLoading,
    refetch: refetchServiceInfo,
  } = useGetServiceStakedInfo();
  const { serviceId } = useServices();
  const {
    data,
    isError,
    isLoading: isRewardsLoading,
    isFetching,
    refetch: refetchRewards,
  } = useQuery({
    queryKey: [],
    async queryFn() {
      const allRewardsResponse = await request(SUBGRAPH_URL, fetchRewardsQuery);
      return allRewardsResponse as { allRewards: RewardHistoryResponse[] };
    },
    select: (data) => {
      const allRewards = groupBy(data.allRewards, 'contractAddress');
      const beta2switchTimestamp =
        serviceStakedInfo[StakingProgramId.Beta2].timestamp;
      const beta2Rewards = allRewards[beta2Address.toLowerCase()];
      const betaSwitchTimestamp =
        serviceStakedInfo[StakingProgramId.Beta].timestamp;
      const betaRewards = allRewards[betaAddress.toLowerCase()];

      const beta2ContractDetails = {
        id: beta2Address,
        name: STAKING_PROGRAM_META[StakingProgramId.Beta2].name,
        history: transformRewards(
          beta2Rewards,
          serviceId,
          beta2switchTimestamp,
        ),
      };

      const betaContractRewards = {
        id: betaAddress,
        name: STAKING_PROGRAM_META[StakingProgramId.Beta].name,
        history: transformRewards(betaRewards, serviceId, betaSwitchTimestamp),
      };

      const rewards = [];
      if (beta2ContractDetails.history.some((epoch) => epoch.earned)) {
        rewards.push(beta2ContractDetails);
      }
      if (betaContractRewards.history.some((epoch) => epoch.earned)) {
        rewards.push(betaContractRewards);
      }

      const parsedRewards = StakingRewardSchema.array().safeParse(rewards);
      if (!parsedRewards.success) {
        throw new Error(parsedRewards.error.errors.join(', '));
      }

      return parsedRewards.data;
    },
    refetchOnWindowFocus: false,
    refetchInterval: ONE_DAY,
    enabled: !!serviceId,
  });

  const refetch = useCallback(() => {
    refetchRewards();
    refetchServiceInfo();
  }, [refetchRewards, refetchServiceInfo]);

  return {
    isError,
    isFetching,
    isLoading: isServiceInfoLoading || isRewardsLoading,
    refetch,
    rewards: data,
  };
};
