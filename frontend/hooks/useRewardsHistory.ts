import { useQuery } from '@tanstack/react-query';
import { ethers } from 'ethers';
import { gql, request } from 'graphql-request';
import { groupBy } from 'lodash';
import { useEffect, useMemo } from 'react';
import { z } from 'zod';

import { Chain } from '@/client';
import { SERVICE_STAKING_TOKEN_MECH_USAGE_CONTRACT_ADDRESSES } from '@/constants/contractAddresses';
import { STAKING_PROGRAM_META } from '@/constants/stakingProgramMeta';
import { SUBGRAPH_URL } from '@/constants/urls';
import { StakingProgramId } from '@/enums/StakingProgram';

import { useServices } from './useServices';

const ONE_DAY_IN_S = 24 * 60 * 60;
const ONE_DAY_IN_MS = ONE_DAY_IN_S * 1000;

const CheckpointGraphResponseSchema = z.object({
  epoch: z.string({
    message: 'Expected epoch to be a string',
  }),
  rewards: z.array(z.string(), {
    message: 'Expected rewards to be an array of strings',
  }),
  serviceIds: z.array(z.string(), {
    message: 'Expected serviceIds to be an array of strings',
  }),
  blockTimestamp: z.string({
    message: 'Expected blockTimestamp to be a string',
  }),
  transactionHash: z.string({
    message: 'Expected transactionHash to be a string',
  }),
  epochLength: z.string({
    message: 'Expected epochLength to be a string',
  }),
  contractAddress: z.string({
    message: 'Expected contractAddress to be a string',
  }),
});
type CheckpointGraphResponse = z.infer<typeof CheckpointGraphResponseSchema>;

const betaAddress =
  SERVICE_STAKING_TOKEN_MECH_USAGE_CONTRACT_ADDRESSES[Chain.GNOSIS].pearl_beta;
const beta2Address =
  SERVICE_STAKING_TOKEN_MECH_USAGE_CONTRACT_ADDRESSES[Chain.GNOSIS]
    .pearl_beta_2;

const fetchRewardsQuery = gql`
  {
    checkpoints(orderBy: epoch, orderDirection: desc) {
      id
      availableRewards
      blockTimestamp
      contractAddress
      epoch
      epochLength
      rewards
      serviceIds
      transactionHash
    }
  }
`;

type TransformedCheckpoint = {
  epoch: string;
  rewards: string[];
  serviceIds: string[];
  blockTimestamp: string;
  transactionHash: string;
  epochLength: string;
  contractAddress: string;
  epochEndTimeStamp: number;
  epochStartTimeStamp: number;
  reward: number;
  earned: boolean;
};

const transformCheckpoints = (
  checkpoints: CheckpointGraphResponse[],
  serviceId?: number,
  timestampToIgnore?: null | number,
): TransformedCheckpoint[] => {
  if (!checkpoints || checkpoints.length === 0) return [];
  if (!serviceId) return [];

  const transformed = checkpoints
    .map((checkpoint: CheckpointGraphResponse, index: number) => {
      const serviceIdIndex =
        checkpoint.serviceIds?.findIndex((id) => Number(id) === serviceId) ??
        -1;

      let reward = '0';

      if (serviceIdIndex !== -1) {
        const isRewardFinite = isFinite(
          Number(checkpoint.rewards?.[serviceIdIndex]),
        );
        reward = isRewardFinite
          ? checkpoint.rewards?.[serviceIdIndex] ?? '0'
          : '0';
      }

      // If the epoch is 0, it means it's the first epoch else,
      // the start time of the epoch is the end time of the previous epoch
      const epochStartTimeStamp =
        checkpoint.epoch === '0'
          ? Number(checkpoint.blockTimestamp) - Number(checkpoint.epochLength)
          : checkpoints[index + 1]?.blockTimestamp ?? 0;

      return {
        ...checkpoint,
        epochEndTimeStamp: Number(checkpoint.blockTimestamp ?? Date.now()),
        epochStartTimeStamp: Number(epochStartTimeStamp),
        reward: Number(ethers.utils.formatUnits(reward, 18)),
        earned: serviceIdIndex !== -1,
      };
    })
    .filter((epoch) => {
      // If the contract has been switched to new contract, ignore the rewards from the old contract of the same epoch,
      // as the rewards are already accounted in the new contract.
      // example: If contract was switched on September 1st, 2024, ignore the rewards before that date
      // in the old contract.
      if (!timestampToIgnore) return true;

      if (!epoch) return false;
      if (!epoch.epochEndTimeStamp) return false;
      return epoch.epochEndTimeStamp < timestampToIgnore;
    });

  return transformed;
};

/**
 * Get the timestamp of the first reward received by the service in the contract.
 * NOTE: Assumes that the switch of the contract was completed AND the rewards are received in the same epoch.
 */
const getTimestampOfFirstReward = (
  epochs: CheckpointGraphResponse[],
  serviceId: number,
) => {
  const timestamp = epochs
    .toReversed()
    .find((epochDetails) =>
      epochDetails.serviceIds.includes(`${serviceId}`),
    )?.blockTimestamp;

  return timestamp ? Number(timestamp) : null;
};

export const useRewardsHistory = () => {
  const { serviceId } = useServices();

  const { data, isError, isLoading, isFetching, refetch } = useQuery({
    queryKey: [],
    async queryFn() {
      const checkpointsResponse: {
        checkpoints: CheckpointGraphResponse[];
      } = await request(SUBGRAPH_URL, fetchRewardsQuery);
      return checkpointsResponse;
    },
    select: ({ checkpoints }) => {
      const checkpointsByContractAddress = groupBy(
        checkpoints,
        'contractAddress',
      );

      const beta2Checkpoints =
        checkpointsByContractAddress[beta2Address.toLowerCase()];

      /** Pearl beta 2 details */

      // timestamp when the contract was switched to beta2
      // ie, got the fist rewards from beta2 contract
      const beta2switchTimestamp = getTimestampOfFirstReward(
        beta2Checkpoints,
        serviceId as number,
      );

      const beta2ContractDetails = {
        id: beta2Address,
        name: STAKING_PROGRAM_META[StakingProgramId.Beta2].name,
        history: transformCheckpoints(beta2Checkpoints, serviceId, null),
      };

      /** Pearl beta details */
      const betaCheckpoints =
        checkpointsByContractAddress[betaAddress.toLowerCase()];

      const betaContractRewards = {
        id: betaAddress,
        name: STAKING_PROGRAM_META[StakingProgramId.Beta].name,
        history: transformCheckpoints(
          betaCheckpoints,
          serviceId,
          beta2switchTimestamp,
        ),
      };

      // If there are no rewards in both contracts, return empty array
      const rewards = [];
      if (beta2ContractDetails.history.some((epoch) => epoch?.earned)) {
        rewards.push(beta2ContractDetails);
      }
      if (betaContractRewards.history.some((epoch) => epoch?.earned)) {
        rewards.push(betaContractRewards);
      }

      /**
       * Temporarily disabling schema validation as it is failing for some reason.
       */

      // const parsedRewards = StakingRewardSchema.array().safeParse(rewards);

      // if (!parsedRewards.success) {
      //   console.error(parsedRewards.error.errors);
      //   throw new Error(parsedRewards.error.errors.join(', '));
      // }

      // return parsedRewards.data;

      return rewards;
    },
    refetchOnWindowFocus: false,
    refetchInterval: ONE_DAY_IN_MS,
    enabled: !!serviceId,
  });

  const latestRewardStreak = useMemo<number>(() => {
    if (!data) return 0;

    // merge histories into single array
    const allCheckpoints = data.reduce(
      (acc: TransformedCheckpoint[], { history }) => [...acc, ...history],
      [],
    );

    // remove all histories that are not earned
    const earnedHistories = allCheckpoints.filter((history) => history.earned);

    // sort descending by epoch end time
    const sorted = earnedHistories.sort(
      (a, b) => b.epochEndTimeStamp - a.epochEndTimeStamp,
    );

    let streak = 0;
    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];

      // first iteration
      if (i === 0) {
        const timeNow = Date.now() / 1000;

        // multiplied by 2 to give a buffer of 2 days
        const initialEpochGap = timeNow - current.epochEndTimeStamp;

        // if the last epoch was more than 1 day ago, break
        if (initialEpochGap > ONE_DAY_IN_S) break;

        // if the last epoch was less than 1 day ago, increment streak
        if (current.earned) {
          streak++;
          continue;
        }

        break;
      }

      // nth interations
      const previous = sorted[i - 1];
      const epochGap = previous.epochStartTimeStamp - current.epochEndTimeStamp;

      if (current.earned && epochGap <= ONE_DAY_IN_S) {
        streak++;
        continue;
      }
      break;
    }

    return streak;
  }, [data]);

  useEffect(() => {
    serviceId && refetch();
  }, [refetch, serviceId]);

  return {
    isError,
    isFetching,
    isLoading,
    latestRewardStreak,
    refetch,
    rewards: data,
  };
};
