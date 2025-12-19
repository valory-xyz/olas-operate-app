import { useQuery } from '@tanstack/react-query';
import { ethers } from 'ethers';
import { Maybe } from 'graphql/jsutils/Maybe';
import { gql, request } from 'graphql-request';
import { groupBy, isEmpty, isNil } from 'lodash';
import { useCallback, useEffect, useMemo } from 'react';
import { z } from 'zod';

import { STAKING_PROGRAMS } from '@/config/stakingPrograms';
import { REACT_QUERY_KEYS } from '@/constants';
import { EvmChainId } from '@/constants/chains';
import { REWARDS_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN } from '@/constants/urls';
import { Address } from '@/types/Address';
import { Nullable } from '@/types/Util';
import { asMiddlewareChain } from '@/utils';
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

const fetchRewardsQuery = (chainId: EvmChainId, serviceId: Maybe<number>) => {
  const supportedStakingContracts = Object.values(
    STAKING_PROGRAMS[chainId],
  ).map((program) => `"${program.address}"`);

  return gql`
  {
    checkpoints(
      orderBy: blockTimestamp
      orderDirection: desc
      first: 1000
      where: {
        contractAddress_in: [${supportedStakingContracts}]
        ${serviceId ? `serviceIds_contains: ["${serviceId}"]` : ''}
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
      {
        canCheckpointsHaveMissingEpochs,
      }: { canCheckpointsHaveMissingEpochs?: boolean } = {},
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
            reward = isRewardFinite ? (currentReward ?? '0') : '0';
          }

          const blockTimestamp = Number(checkpoint.blockTimestamp);
          const epochLength = Number(checkpoint.epochLength);

          /**
           * If:
           *   1. The epoch is 0, it means it's the first epoch
           *   2. The checkpoint list can have missing epochs
           * Else:
           *   The start time of the epoch is the end time of the previous epoch
           *
           * TODO: Add start/end time in the subgraph
           */
          const epochStartTimeStamp =
            checkpoint.epoch === '0' || canCheckpointsHaveMissingEpochs
              ? blockTimestamp - epochLength
              : (checkpoints[index + 1]?.blockTimestamp ?? 0);

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
  filterQueryByServiceId: boolean = false,
) => {
  const transformCheckpoints = useTransformCheckpoints();

  return useQuery({
    queryKey: REACT_QUERY_KEYS.REWARDS_HISTORY_KEY(
      chainId,
      serviceId!,
      filterQueryByServiceId,
    ),
    queryFn: async () => {
      const checkpointsResponse = await request<CheckpointsResponse>(
        REWARDS_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN[chainId],
        fetchRewardsQuery(chainId, filterQueryByServiceId ? serviceId : null),
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
          { canCheckpointsHaveMissingEpochs: !!filterQueryByServiceId },
        );

        return { ...acc, [stakingContractAddress]: transformedCheckpoints };
      }, {});
    },
    enabled: !!serviceId,
    refetchInterval: ONE_DAY_IN_MS,
  });
};

/**
 * Hook to get the rewards for a service ID. It adds the serviceId filter to the query
 * in order to fetch only the relevant contract checkpoints. Use this to get more accurate
 * rewards history for the service
 */
export const useServiceOnlyRewardsHistory = () => {
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
    data: contractCheckpointsWithServiceId,
  } = useContractCheckpoints(homeChainId, serviceNftTokenId, true);

  // All contract checkpoints (without serviceId filter)
  const { data: allContractCheckpoints } = useContractCheckpoints(
    homeChainId,
    serviceNftTokenId,
  );

  const totalRewards = useMemo(() => {
    if (!contractCheckpointsWithServiceId) return 0;
    return Object.values(contractCheckpointsWithServiceId)
      .flat()
      .reduce((acc, checkpoint) => {
        return acc + checkpoint.reward;
      }, 0);
  }, [contractCheckpointsWithServiceId]);

  /**
   * Sorts the checkpoints as per the epoch timestamps, uses `allContractCheckpoints` to
   * fills in the missing epochs (where the service didn't earn any rewards).
   */
  const epochSortedCheckpoints = useMemo<Checkpoint[]>(() => {
    if (!contractCheckpointsWithServiceId) return [];
    if (!allContractCheckpoints) return [];

    const filledCheckpoints: Checkpoint[] = [];
    let previousCheckpoint: Checkpoint | null = null;

    Object.values(contractCheckpointsWithServiceId)
      .flat()
      .sort((a, b) => a.epochEndTimeStamp - b.epochEndTimeStamp)
      .forEach((checkpoint) => {
        const {
          contractAddress,
          epoch,
          epochStartTimeStamp: currentEpochStartTimeStamp,
        } = checkpoint;
        const {
          contractAddress: previousContractAddress,
          epoch: previousEpoch,
          epochEndTimeStamp: previousEpochEndTimeStamp,
        } = previousCheckpoint ?? {};

        /**
         * 1. If it is the first time service has earned any rewards, i.e. the first item of the list
         * 2. If it's the same contract and the current epoch is right next to the previous epoch.
         * eg:
         *    previousCheckpoint = {epoch: 299, ...}
         *    checkpoint = {epoch: 300, ...}
         */
        if (
          previousCheckpoint === null ||
          (contractAddress === previousContractAddress &&
            Number(epoch) === Number(previousEpoch) + 1)
        ) {
          filledCheckpoints.push(checkpoint);
        } else if (contractAddress === previousContractAddress) {
          /**
           * If it's the same contract (but we missed some epochs - implicit,
           * as the first condition isn't true), fill in the missing epochs.
           * eg:
           *    previousCheckpoint = {epoch: 302, contractAddress: "0x155547857680A6D51bebC5603397488988DEb1c8", ...}
           *    checkpoint = {epoch: 310, contractAddress: "0x155547857680A6D51bebC5603397488988DEb1c8", ...}
           */
          const missingEpochs = allContractCheckpoints?.[
            contractAddress
          ]?.filter(
            ({ epoch: checkpointEpoch }) =>
              Number(checkpointEpoch) > Number(previousEpoch) &&
              Number(checkpointEpoch) < Number(epoch),
          );

          filledCheckpoints.push(...(missingEpochs ?? []));
          filledCheckpoints.push(checkpoint);
        } else if (contractAddress !== previousContractAddress) {
          /**
           * If the contract is switched, check if we need to fill in any epochs
           * eg:
           *    previousCheckpoint = {epoch: 101, contractAddress: "0x155547857680A6D51bebC5603397488988DEb1c8", ...}
           *    checkpoint = {epoch: 61, contractAddress: "0xfE1D36820546cE5F3A58405950dC2F5ccDf7975C", ...}
           */
          const missingEpochs = allContractCheckpoints?.[
            previousContractAddress ?? contractAddress
          ]?.filter(
            ({ epochStartTimeStamp, epochEndTimeStamp }) =>
              Number(epochStartTimeStamp) > Number(previousEpochEndTimeStamp) &&
              Number(epochEndTimeStamp) < Number(currentEpochStartTimeStamp),
          );
          filledCheckpoints.push(...(missingEpochs ?? []));
          filledCheckpoints.push(checkpoint);
        } else {
          filledCheckpoints.push(checkpoint);
        }
        previousCheckpoint = checkpoint;
      });

    const lastCheckpoint = filledCheckpoints.at(-1);

    /**
     * Fill missing epochs after the last "earned" checkpoint, for eg:
     * Last earned epoch is 301, and the current epoch is 305, this fills in data from 302-305 epochs .
     */
    if (lastCheckpoint) {
      const { contractAddress, epoch } = lastCheckpoint;
      const missingEpochs = allContractCheckpoints[contractAddress]?.filter(
        ({ epoch: checkpointEpoch }) => Number(checkpointEpoch) > Number(epoch),
      );
      filledCheckpoints.push(...(missingEpochs ?? []));
    }

    return filledCheckpoints.sort(
      (a, b) => b.epochEndTimeStamp - a.epochEndTimeStamp,
    );
  }, [contractCheckpointsWithServiceId, allContractCheckpoints]);

  return {
    isError,
    isLoading,
    isFetched,
    refetch,
    totalRewards,
    /** checkpoints across all contracts */
    allCheckpoints: epochSortedCheckpoints,
  };
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

  // find the recent contract address where the service has participated in
  const recentStakingContractAddress = useMemo(() => {
    if (!contractCheckpoints) return;

    return Object.values(contractCheckpoints)
      .flat()
      .sort((a, b) => b.epochEndTimeStamp - a.epochEndTimeStamp)
      .find((checkpoint) =>
        checkpoint.serviceIds.includes(`${serviceNftTokenId}`),
      )?.contractAddress;
  }, [contractCheckpoints, serviceNftTokenId]);

  return {
    isError,
    isFetched,
    isLoading,
    latestRewardStreak,
    refetch,
    allCheckpoints: epochSortedCheckpoints,
    contractCheckpoints,
    recentStakingContractAddress,
  };
};
