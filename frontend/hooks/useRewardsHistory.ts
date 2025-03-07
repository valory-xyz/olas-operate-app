import { useQuery } from '@tanstack/react-query';
import { ethers } from 'ethers';
import { Maybe } from 'graphql/jsutils/Maybe';
import { gql, request } from 'graphql-request';
import { groupBy, isEmpty, isNil } from 'lodash';
import { useCallback, useEffect, useMemo } from 'react';
import { z } from 'zod';

import { STAKING_PROGRAM_ADDRESS } from '@/config/stakingPrograms';
import { REACT_QUERY_KEYS } from '@/constants/react-query-keys';
import { REWARDS_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN } from '@/constants/urls';
import { EvmChainId } from '@/enums/Chain';
import { Address } from '@/types/Address';
import { Nullable } from '@/types/Util';
import { asMiddlewareChain } from '@/utils/middlewareHelpers';
import { ONE_DAY_IN_MS } from '@/utils/time';

import { useService } from './useService';
import { useServices } from './useServices';

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

const fetchRewardsQuery = (chainId: EvmChainId) => {
  const supportedStakingContracts = Object.values(
    STAKING_PROGRAM_ADDRESS[chainId],
  ).map((address) => `"${address}"`);

  return gql`
  {
    checkpoints(
      orderBy: epoch
      orderDirection: desc
      first: 1000
      where: {
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
};

export type Checkpoint = {
  epoch: string;
  rewards: string[];
  serviceIds: string[];
  blockTimestamp: string;
  transactionHash: string;
  epochLength: string;
  contractAddress: string;
  contractName: Nullable<string>;
  epochEndTimeStamp: number;
  epochStartTimeStamp: number;
  reward: number;
  earned: boolean;
};

/**
 * function to transform the checkpoints data from the subgraph
 * to include additional information like epoch start and end time,
 * rewards, etc.
 */
const useTransformCheckpoints = () => {
  const { selectedAgentConfig } = useServices();
  const { serviceApi: agent, evmHomeChainId: chainId } = selectedAgentConfig;

  return useCallback(
    (
      serviceId: number,
      checkpoints: CheckpointResponse[],
      timestampToIgnore?: null | number,
    ) => {
      if (!checkpoints || checkpoints.length === 0) return [];
      if (!serviceId) return [];

      return checkpoints
        .map((checkpoint: CheckpointResponse, index: number) => {
          const serviceIdIndex =
            checkpoint.serviceIds?.findIndex(
              (id) => Number(id) === serviceId,
            ) ?? -1;

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
              ? Number(checkpoint.blockTimestamp) -
                Number(checkpoint.epochLength)
              : checkpoints[index + 1]?.blockTimestamp ?? 0;

          const stakingContractId = agent.getStakingProgramIdByAddress(
            chainId,
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
    },
    [agent, chainId],
  );
};

type CheckpointsResponse = { checkpoints: CheckpointResponse[] };

/**
 * hook to fetch rewards history for all contracts
 */
const useContractCheckpoints = (
  chainId: EvmChainId,
  serviceId: Maybe<number>,
) => {
  const transformCheckpoints = useTransformCheckpoints();

  return useQuery({
    queryKey: REACT_QUERY_KEYS.REWARDS_HISTORY_KEY(chainId, serviceId!),
    queryFn: async () => {
      const checkpointsResponse = await request<CheckpointsResponse>(
        REWARDS_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN[chainId],
        fetchRewardsQuery(chainId),
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
      if (isNil(checkpoints) || isEmpty(checkpoints)) return {};

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
          serviceId,
          checkpoints,
          null,
        );

        return { ...acc, [stakingContractAddress]: transformedCheckpoints };
      }, {});
    },
    enabled: !!serviceId,
    refetchInterval: ONE_DAY_IN_MS,
    refetchOnWindowFocus: false,
  });
};

export const useRewardsHistory = () => {
  const { selectedService, selectedAgentConfig } = useServices();
  const { evmHomeChainId: homeChainId } = selectedAgentConfig;
  const serviceConfigId = selectedService?.service_config_id;
  const { service } = useService(serviceConfigId);

  const serviceNftTokenId =
    service?.chain_configs?.[asMiddlewareChain(homeChainId)]?.chain_data?.token;

  const {
    isError,
    isLoading,
    isFetched,
    refetch,
    data: contractCheckpoints,
  } = useContractCheckpoints(homeChainId, serviceNftTokenId);

  const epochSortedCheckpoints = useMemo<Checkpoint[]>(
    () =>
      Object.values(contractCheckpoints ?? {})
        .flat()
        .sort((a, b) => b.epochEndTimeStamp - a.epochEndTimeStamp),
    [contractCheckpoints],
  );

  const latestRewardStreak = useMemo<number>(() => {
    if (isLoading || !isFetched) return 0;
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

      if (current.earned && epochGap <= Number(current.epochLength)) {
        return streakCount + 1;
      }

      isStreakBroken = true;
      return streakCount;
    }, 0);
  }, [isLoading, isFetched, contractCheckpoints, epochSortedCheckpoints]);

  useEffect(() => {
    serviceNftTokenId && refetch();
  }, [refetch, serviceNftTokenId]);

  return {
    isError,
    isFetched,
    isLoading,
    latestRewardStreak,
    refetch,
    allCheckpoints: epochSortedCheckpoints,
    contractCheckpoints,
  };
};
