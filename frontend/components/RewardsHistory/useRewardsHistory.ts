import { useQuery } from '@tanstack/react-query';
import { ethers } from 'ethers';
import { gql, request } from 'graphql-request';
import { groupBy } from 'lodash';
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

const betaAddress =
  SERVICE_STAKING_TOKEN_MECH_USAGE_CONTRACT_ADDRESSES[Chain.GNOSIS].pearl_beta;
const beta2Address =
  SERVICE_STAKING_TOKEN_MECH_USAGE_CONTRACT_ADDRESSES[Chain.GNOSIS]
    .pearl_beta_2;

const SUBGRAPH_URL =
  'https://api.studio.thegraph.com/query/81855/pearl-staking-rewards-history/version/latest';

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
) => {
  if (!rewards || rewards.length === 0) return [];
  if (!serviceId) return [];

  return rewards.map((currentReward: RewardHistoryResponse, index: number) => {
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
  });
};

export const useRewardsHistory = () => {
  const { serviceId } = useServices();
  const { data, isError, isLoading, isFetching, refetch } = useQuery({
    queryKey: [],
    async queryFn() {
      return await request(SUBGRAPH_URL, fetchRewardsQuery);
    },
    select: (data) => {
      const allRewards = groupBy(
        (data as { allRewards: RewardHistoryResponse[] }).allRewards,
        'contractAddress',
      );
      const betaRewards = allRewards[betaAddress.toLowerCase()];
      const beta2Rewards = allRewards[beta2Address.toLowerCase()];

      const beta2ContractDetails = {
        id: beta2Address,
        name: STAKING_PROGRAM_META[StakingProgramId.Beta2].name,
        history: transformRewards(beta2Rewards, serviceId),
        /**
         * - how do we know the service has been changed?
         * - service created for the current user? which event is it?
         *   - find the block timestamp of the service creation event
         *   - find the epoch that the service was created
         * - remove the rewards before the service was created
         */
      };

      const betaContractRewards = {
        id: betaAddress,
        name: STAKING_PROGRAM_META[StakingProgramId.Beta].name,
        history: transformRewards(betaRewards, serviceId),
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
  });

  return {
    isError,
    isFetching,
    isLoading,
    refetch,
    rewards: data,
  };
};
