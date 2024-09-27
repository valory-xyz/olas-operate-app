import { useQuery } from '@tanstack/react-query';
import { ethers } from 'ethers';
import { gql, request } from 'graphql-request';
import { groupBy } from 'lodash';

import { Chain } from '@/client';
import { SERVICE_STAKING_TOKEN_MECH_USAGE_CONTRACT_ADDRESSES } from '@/constants/contractAddresses';
import { STAKING_PROGRAM_META } from '@/constants/stakingProgramMeta';
import { StakingProgramId } from '@/enums/StakingProgram';
import { useServices } from '@/hooks/useServices';

import { EpochDetails, StakingReward } from './types';

type RewardHistoryResponse = {
  epoch: string;
  rewards: string[];
  serviceIds: string[];
  blockTimestamp: string;
  transactionHash: string;
  epochLength: number;
};

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

  return rewards.map((item: RewardHistoryResponse) => {
    const serviceIdIndex = item.serviceIds.findIndex(
      (id) => Number(id) === serviceId,
    );
    const reward =
      serviceIdIndex === -1
        ? 0
        : ethers.utils.formatUnits(item.rewards[serviceIdIndex], 18);

    return {
      epochEndTimeStamp: Number(item.blockTimestamp),
      epochStartTimeStamp:
        Number(item.blockTimestamp) - Number(item.epochLength),
      reward,
      earned: serviceIdIndex !== -1,
      transactionHash: item.transactionHash,
    } as EpochDetails;
  });
};

export const useRewardsHistory = () => {
  const { serviceId } = useServices();
  const { data, isError, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['rewardsHistory', serviceId],
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

      return [
        {
          id: beta2Address,
          name: STAKING_PROGRAM_META[StakingProgramId.Beta2].name,
          history: transformRewards(beta2Rewards, serviceId),
        },
        {
          id: betaAddress,
          name: STAKING_PROGRAM_META[StakingProgramId.Beta].name,
          history: transformRewards(betaRewards, serviceId),
        },
      ] as StakingReward[];
    },
    refetchOnWindowFocus: false,
    refetchInterval: 5 * 60 * 1000,
  });

  return {
    isError,
    isFetching,
    isLoading,
    refetch,
    rewards: data,
  };
};
