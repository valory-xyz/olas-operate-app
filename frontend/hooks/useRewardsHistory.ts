import { useQuery } from '@tanstack/react-query';
import { ethers } from 'ethers';
import { gql, request } from 'graphql-request';
import { groupBy } from 'lodash';
import { useEffect, useMemo } from 'react';
import { z } from 'zod';

import { GNOSIS_SERVICE_STAKING_CONTRACT_ADDRESSES } from '@/constants/contractAddresses';
import { GNOSIS_REWARDS_HISTORY_SUBGRAPH_URL } from '@/constants/urls';
import { Address } from '@/types/Address';
import { getStakingProgramIdByAddress } from '@/utils/service';

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
    message: 'Expected contractAddress to be a valid Ethereum address',
  }),
});
const CheckpointsGraphResponseSchema = z.array(CheckpointGraphResponseSchema);
type CheckpointResponse = z.infer<typeof CheckpointGraphResponseSchema>;

const supportedStakingContracts = Object.values(
  GNOSIS_SERVICE_STAKING_CONTRACT_ADDRESSES,
).map((address) => `"${address}"`);

const fetchRewardsQuery = gql`
  {
    checkpoints(
      orderBy: epoch
      orderDirection: desc
      first: 1000
      where: {
        serviceIds_not: []
        contractAddress_in: [${supportedStakingContracts}]
      }
    ) {
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

export type Checkpoint = {
  epoch: string;
  rewards: string[];
  serviceIds: string[];
  blockTimestamp: string;
  transactionHash: string;
  epochLength: string;
  contractAddress: string;
  contractName?: string;
  epochEndTimeStamp: number;
  epochStartTimeStamp: number;
  reward: number;
  earned: boolean;
};

const transformCheckpoints = (
  checkpoints: CheckpointResponse[],
  serviceId: number,
  timestampToIgnore?: null | number,
): Checkpoint[] => {
  if (!checkpoints || checkpoints.length === 0) return [];
  if (!serviceId) return [];

  return checkpoints
    .map((checkpoint: CheckpointResponse, index: number) => {
      const serviceIdIndex =
        checkpoint.serviceIds?.findIndex((id) => Number(id) === serviceId) ??
        -1;

      let reward = '0';

      if (serviceIdIndex !== -1) {
        const currentReward = checkpoint.rewards?.[serviceIdIndex];
        const isRewardFinite = isFinite(Number(currentReward));
        reward = isRewardFinite ? currentReward ?? '0' : '0';
      }

      // If the epoch is 0, it means it's the first epoch else,
      // the start time of the epoch is the end time of the previous epoch
      const epochStartTimeStamp =
        checkpoint.epoch === '0'
          ? Number(checkpoint.blockTimestamp) - Number(checkpoint.epochLength)
          : checkpoints[index + 1]?.blockTimestamp ?? 0;

      const stakingContractId = getStakingProgramIdByAddress(
        checkpoint.contractAddress as Address,
      );

      return {
        ...checkpoint,
        epochEndTimeStamp: Number(checkpoint.blockTimestamp ?? Date.now()),
        epochStartTimeStamp: Number(epochStartTimeStamp),
        reward: Number(ethers.utils.formatUnits(reward, 18)),
        earned: serviceIdIndex !== -1,
        contractName: stakingContractId,
      };
    })
    .filter((checkpoint) => {
      // If the contract has been switched to new contract,
      // ignore the rewards from the old contract of the same epoch,
      // as the rewards are already accounted in the new contract.
      // Example: If contract was switched on September 1st, 2024,
      // ignore the rewards before that date in the old contract.
      if (!timestampToIgnore) return true;

      if (!checkpoint) return false;
      if (!checkpoint.epochEndTimeStamp) return false;

      return checkpoint.epochEndTimeStamp < timestampToIgnore;
    });
};

type CheckpointsResponse = { checkpoints: CheckpointResponse[] };

/**
 * hook to fetch rewards history for all contracts
 */
const useContractCheckpoints = () => {
  const { serviceId } = useServices();

  return useQuery({
    queryKey: [],
    async queryFn() {
      if (!serviceId) return [];

      const checkpointsResponse = await request<CheckpointsResponse>(
        GNOSIS_REWARDS_HISTORY_SUBGRAPH_URL,
        fetchRewardsQuery,
      );

      const parsedCheckpoints = CheckpointsGraphResponseSchema.safeParse(
        checkpointsResponse.checkpoints,
      );

      if (parsedCheckpoints.error) {
        console.error(parsedCheckpoints.error);
        return [];
      }

      return parsedCheckpoints.data;
    },
    select: (checkpoints): { [contractAddress: string]: Checkpoint[] } => {
      if (!serviceId) return {};
      if (!checkpoints) return {};

      // group checkpoints by contract address (staking program)
      const checkpointsByContractAddress = groupBy(
        checkpoints,
        'contractAddress',
      );

      // only need relevant contract history that service has participated in,
      // ignore contract addresses with no activity from the service
      return Object.keys(checkpointsByContractAddress).reduce<{
        [stakingContractAddress: string]: Checkpoint[];
      }>((acc, stakingContractAddress: string) => {
        const checkpoints =
          checkpointsByContractAddress[stakingContractAddress];

        // skip if there are no checkpoints for the contract address
        if (!checkpoints) return acc;
        if (checkpoints.length <= 0) return acc;

        // check if the service has participated in the staking contract
        // if not, skip the contract
        const isServiceParticipatedInContract = checkpoints.some((checkpoint) =>
          checkpoint.serviceIds.includes(`${serviceId}`),
        );
        if (!isServiceParticipatedInContract) return acc;

        // transform the checkpoints, includes epoch start and end time, rewards, etc
        const transformedCheckpoints = transformCheckpoints(
          checkpoints,
          serviceId,
          null,
        );

        return { ...acc, [stakingContractAddress]: transformedCheckpoints };
      }, {});
    },
    refetchOnWindowFocus: false,
    refetchInterval: ONE_DAY_IN_MS,
    enabled: !!serviceId,
  });
};

export const useRewardsHistory = () => {
  const { serviceId } = useServices();
  const {
    isError,
    isLoading,
    isFetching,
    refetch,
    data: contractCheckpoints,
  } = useContractCheckpoints();

  const epochSortedCheckpoints = useMemo<Checkpoint[]>(
    () =>
      Object.values(contractCheckpoints ?? {})
        .flat()
        .sort((a, b) => b.epochEndTimeStamp - a.epochEndTimeStamp),
    [contractCheckpoints],
  );

  const latestRewardStreak = useMemo<number>(() => {
    if (isLoading || isFetching) return 0;
    if (!contractCheckpoints) return 0;

    // remove all histories that are not earned
    const earnedCheckpoints = epochSortedCheckpoints.filter(
      (checkpoint) => checkpoint.earned,
    );

    const timeNow = Math.trunc(Date.now() / 1000);

    let isStreakBroken = false; // flag to break the streak
    return earnedCheckpoints.reduce((streakCount, current, i) => {
      if (isStreakBroken) return streakCount;

      // first iteration
      if (i === 0) {
        const initialEpochGap = Math.trunc(timeNow - current.epochEndTimeStamp);

        // If the epoch gap is greater than the epoch length
        if (initialEpochGap > Number(current.epochLength)) {
          isStreakBroken = true;
          return streakCount;
        }

        if (current.earned) {
          return streakCount + 1;
        }

        isStreakBroken = true;
        return streakCount;
      }

      // other iterations
      const previous = earnedCheckpoints[i - 1];
      const epochGap = previous.epochStartTimeStamp - current.epochEndTimeStamp;

      if (current.earned && Number(current.epochLength) > epochGap) {
        return streakCount + 1;
      }

      isStreakBroken = true;
      return streakCount;
    }, 0);
  }, [isLoading, isFetching, epochSortedCheckpoints, contractCheckpoints]);

  useEffect(() => {
    serviceId && refetch();
  }, [refetch, serviceId]);

  return {
    isError,
    isFetching,
    isLoading,
    latestRewardStreak,
    refetch,
    allCheckpoints: epochSortedCheckpoints,
    contractCheckpoints,
  };
};
