import { useQuery } from '@tanstack/react-query';
import { ethers } from 'ethers';
import { gql, GraphQLClient, request } from 'graphql-request';
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

const GRAPH_CLIENT = new GraphQLClient(SUBGRAPH_URL, {
  jsonSerializer: {
    parse: JSON.parse,
    stringify: JSON.stringify,
  },
});

const id = 499;
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
    serviceStakedInfo: {
      serviceStakeds(orderBy: epoch, where: { serviceId: "${id}" }, first: 1) {
        blockTimestamp
        epoch
        owner
      }
    }
  }
`;

const serviceStakedQuery = (id: number) => gql`{
  serviceStakedInfo: {
    serviceStakeds(orderBy: epoch, where: { serviceId: "${id}" }, first: 1) {
      blockTimestamp
      epoch
      owner
    }
  }
}`;

export const useFirstStakedBlockTimestamp = () => {
  console.log('useFirstStakedBlockTimestamp');

  const { serviceId } = useServices();
  const { data } = useQuery({
    queryKey: ['serviceStakedInfo', serviceId], // Unique key for the first query
    async queryFn() {
      return await request(
        SUBGRAPH_URL,
        serviceStakedQuery(serviceId as number),
      );
    },
    // select: (data) => {
    //   console.log({ data });

    //   const rawServiceStakedInfo = data as {
    //     serviceStakedInfo: ServiceStakedInfo[];
    //   };
    //   const serviceStakedInfo = rawServiceStakedInfo.serviceStakedInfo[0];
    //   return serviceStakedInfo?.blockTimestamp || -1;
    // },
    enabled: !!serviceId,
    refetchOnWindowFocus: false,
    // refetchInterval: ONE_DAY,
  });

  console.log({ data });

  return data;
};

// const qetFirstStakedBlockTimestamp = async () => {
//   const query = gql`
//     query GetCreateProducts {
//       serviceStakeds(orderBy: epoch, where: { serviceId: "499" }, first: 1) {
//         blockTimestamp
//         epoch
//         owner
//       }
//     }
//   `;
//   const res = await GRAPH_CLIENT.request(query);
//   console.log({ res });
// };

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
  // const firstStakedBlockTimestamp = useFirstStakedBlockTimestamp();
  // console.log(firstStakedBlockTimestamp);

  const { data, isError, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['rewardsHistory', serviceId], // Unique key for the second query
    async queryFn() {
      // const serviceStakedInfo = await GRAPH_CLIENT.request(
      //   serviceStakedQuery(serviceId as number),
      // );
      const allRewardsResponse = await request(SUBGRAPH_URL, fetchRewardsQuery);
      console.log({ allRewardsResponse });
      // return { allRewards: allRewardsResponse };
      return allRewardsResponse as { allRewards: RewardHistoryResponse[] };
    },
    select: (data) => {
      console.log({ data });
      const allRewards = groupBy(data.allRewards, 'contractAddress');
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
    enabled: !!serviceId,
  });

  return {
    isError,
    isFetching,
    isLoading,
    refetch,
    rewards: data,
  };
};
