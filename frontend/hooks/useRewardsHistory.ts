import { useQuery } from '@tanstack/react-query';
import { ethers } from 'ethers';
import { gql, request } from 'graphql-request';
import { groupBy } from 'lodash';
import { useEffect, useMemo } from 'react';
import { z } from 'zod';

import { GNOSIS_REWARDS_HISTORY_SUBGRAPH_URL } from '@/constants/urls';

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

export type TransformedCheckpoint = {
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

export const useRewardsHistory = () => {
  const { serviceId } = useServices();

  const {
    data: contractCheckpoints,
    isError,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: [],
    async queryFn() {
      if (!serviceId) return { checkpoints: [] };

      const checkpointsResponse: {
        checkpoints: CheckpointGraphResponse[];
      } = await request(GNOSIS_REWARDS_HISTORY_SUBGRAPH_URL, fetchRewardsQuery);
      return checkpointsResponse;
    },
    select: ({
      checkpoints,
    }): { [contractAddress: string]: TransformedCheckpoint[] } => {
      if (!serviceId) return {};
      if (!checkpoints) return {};

      // group checkpoints by contract address / staking program
      const checkpointsByContractAddress = groupBy(
        checkpoints,
        'contractAddress',
      );

      // only need relevant contract history that service has participated in
      // ignore contract addresses with no activity from the service
      const relevantTransformedCheckpoints = Object.keys(
        checkpointsByContractAddress,
      ).reduce(
        (
          acc: { [stakingContractAddress: string]: TransformedCheckpoint[] },
          stakingContractAddress: string,
        ) => {
          const checkpoints =
            checkpointsByContractAddress[stakingContractAddress];

          // skip if there are no checkpoints for the contract address
          if (!checkpoints) return acc;
          if (checkpoints.length <= 0) return acc;
          if (
            !checkpoints.some((checkpoint) =>
              checkpoint.serviceIds.includes(`${serviceId}`),
            )
          )
            return acc;

          // transform the checkpoints ..
          // includes epoch start and end time, rewards, etc
          const transformedCheckpoints = transformCheckpoints(
            checkpoints,
            serviceId as number,
            null,
          );

          return {
            ...acc,
            [stakingContractAddress]: transformedCheckpoints,
          };
        },
        {},
      );

      return relevantTransformedCheckpoints;
    },
    refetchOnWindowFocus: false,
    refetchInterval: ONE_DAY_IN_MS,
    enabled: !!serviceId,
  });

  const allCheckpoints = useMemo<TransformedCheckpoint[]>(
    () =>
      Object.values(contractCheckpoints ?? {})
        .flat()
        .sort((a, b) => b.epochEndTimeStamp - a.epochEndTimeStamp),
    [contractCheckpoints],
  );

  const latestRewardStreak = useMemo<number>(() => {
    if (!contractCheckpoints) return 0;

    // remove all histories that are not earned
    const earnedCheckpoints = allCheckpoints.filter(
      (checkpoint) => checkpoint.earned,
    );

    // sort descending by epoch end time
    const sorted = earnedCheckpoints.sort(
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
  }, [allCheckpoints, contractCheckpoints]);

  useEffect(() => {
    serviceId && refetch();
  }, [refetch, serviceId]);

  return {
    isError,
    isFetching,
    isLoading,
    latestRewardStreak,
    refetch,
    allCheckpoints,
    contractCheckpoints,
  };
};
