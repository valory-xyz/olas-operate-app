import { useQuery } from '@tanstack/react-query';
import { ethers } from 'ethers';
import { Maybe } from 'graphql/jsutils/Maybe';
import { gql, request } from 'graphql-request';
import { groupBy } from 'lodash';
import { useCallback, useEffect, useMemo } from 'react';
import { z } from 'zod';

import { REACT_QUERY_KEYS } from '@/constants';
import { EvmChainId } from '@/constants/chains';
import { REWARDS_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN } from '@/constants/urls';
import { Address } from '@/types/Address';
import { Nullable } from '@/types/Util';
import { asMiddlewareChain } from '@/utils';
import { ONE_DAY_IN_MS } from '@/utils/time';

import { useService } from './useService';
import { useServices } from './useServices';

const ServiceRewardsHistorySchema = z.object({
  id: z.string(),
  epoch: z.string(),
  contractAddress: z.string(),
  rewardAmount: z.string(),
  checkpointedAt: z.string().nullable(),
  blockTimestamp: z.string(),
  blockNumber: z.string(),
  transactionHash: z.string(),
  checkpoint: z
    .object({
      epochLength: z.string(),
      availableRewards: z.string(),
    })
    .nullable(),
});

const ServiceSchema = z.object({
  id: z.string(),
  latestStakingContract: z.string().nullable(),
  rewardsHistory: z.array(ServiceRewardsHistorySchema),
});

const ServiceResponseSchema = z.object({
  service: ServiceSchema.nullable(),
});

type ServiceRewardsHistory = z.infer<typeof ServiceRewardsHistorySchema>;
type ServiceResponse = z.infer<typeof ServiceResponseSchema>;

const FETCH_SERVICE_REWARDS_QUERY = gql`
  query GetServiceRewardsHistory($serviceId: ID!) {
    service(id: $serviceId) {
      id
      latestStakingContract
      rewardsHistory(
        orderBy: blockTimestamp
        orderDirection: desc
        first: 1000
      ) {
        id
        epoch
        contractAddress
        rewardAmount
        checkpointedAt
        blockTimestamp
        blockNumber
        transactionHash
        checkpoint {
          epochLength
          availableRewards
        }
      }
    }
  }
`;

export type Checkpoint = {
  epoch: string;
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
 * function to transform the ServiceRewardsHistory data from the subgraph
 * to include additional information like epoch start and end time,
 * rewards, etc.
 */
const useTransformCheckpoints = () => {
  const { selectedAgentConfig } = useServices();
  const { serviceApi: agent, evmHomeChainId: chainId } = selectedAgentConfig;

  return useCallback(
    (
      rewardsHistory: ServiceRewardsHistory[],
      timestampToIgnore?: null | number,
      {
        canCheckpointsHaveMissingEpochs,
      }: { canCheckpointsHaveMissingEpochs?: boolean } = {},
    ): Checkpoint[] => {
      if (!rewardsHistory?.length) return [];

      return rewardsHistory
        .map((history, index) => {
          const blockTimestamp = Number(history.blockTimestamp);
          const epochLength = Number(history.checkpoint?.epochLength ?? 0);

          /**
           * If:
           *   1. The epoch is 0, it means it's the first epoch
           *   2. The checkpoint list can have missing epochs
           * Else:
           *   The start time of the epoch is the end time of the previous epoch
           */
          const epochStartTimeStamp =
            history.epoch === '0' || canCheckpointsHaveMissingEpochs
              ? blockTimestamp - epochLength
              : Number(rewardsHistory[index + 1]?.blockTimestamp ?? 0);

          const stakingContractId = agent.getStakingProgramIdByAddress(
            chainId,
            history.contractAddress as Address,
          );

          return {
            epoch: history.epoch,
            blockTimestamp: history.blockTimestamp,
            transactionHash: history.transactionHash,
            epochLength: history.checkpoint?.epochLength ?? '0',
            contractAddress: history.contractAddress,
            contractName: stakingContractId,
            epochEndTimeStamp: blockTimestamp,
            epochStartTimeStamp,
            reward: Number(ethers.utils.formatUnits(history.rewardAmount, 18)),
            earned: BigInt(history.rewardAmount) > 0n,
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

/**
 * hook to fetch rewards history for all staking contracts
 * for the provided Service ID
 */
const useServiceRewardsHistory = (
  chainId: EvmChainId,
  serviceId: Maybe<number>,
) => {
  const transformCheckpoints = useTransformCheckpoints();

  return useQuery({
    queryKey: REACT_QUERY_KEYS.REWARDS_HISTORY_KEY(chainId, serviceId!),
    queryFn: async () => {
      const response = await request<ServiceResponse>(
        REWARDS_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN[chainId],
        FETCH_SERVICE_REWARDS_QUERY,
        {
          serviceId: serviceId!.toString(),
        },
      );

      const parsedResponse = ServiceResponseSchema.safeParse(response);

      if (parsedResponse.error) {
        console.error('Failed to parse service rewards:', parsedResponse.error);
        return null;
      }

      return parsedResponse.data.service;
    },
    select: (
      service,
    ): {
      contractCheckpoints: { [contractAddress: string]: Checkpoint[] };
      latestStakingContract?: string;
    } => {
      if (!service) {
        return { contractCheckpoints: {}, latestStakingContract: undefined };
      }

      const rewardsHistory = service.rewardsHistory || [];

      // group rewards history by contract address
      const checkpointsByContract = groupBy(rewardsHistory, 'contractAddress');

      const contractCheckpoints = Object.entries(checkpointsByContract).reduce<{
        [stakingContractAddress: string]: Checkpoint[];
      }>((acc, [address, histories]) => {
        if (!histories?.length) return acc;

        // transform the rewards history, includes epoch start and end time, rewards, etc
        const transformed = transformCheckpoints(histories, null);

        return { ...acc, [address]: transformed };
      }, {});

      return {
        contractCheckpoints,
        latestStakingContract: service.latestStakingContract ?? undefined,
      };
    },
    enabled: !!serviceId,
    refetchInterval: ONE_DAY_IN_MS,
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
    data: serviceData,
  } = useServiceRewardsHistory(homeChainId, serviceNftTokenId);

  const contractCheckpoints = serviceData?.contractCheckpoints;
  const recentStakingContractAddress = serviceData?.latestStakingContract;

  const epochSortedCheckpoints = useMemo<Checkpoint[]>(
    () =>
      Object.values(contractCheckpoints ?? {})
        .flat()
        .sort((a, b) => b.epochEndTimeStamp - a.epochEndTimeStamp),
    [contractCheckpoints],
  );

  const totalRewards = useMemo(() => {
    if (!contractCheckpoints) return 0;
    return Object.values(contractCheckpoints)
      .flat()
      .reduce((acc, checkpoint) => acc + checkpoint.reward, 0);
  }, [contractCheckpoints]);

  const latestRewardStreak = useMemo<number>(() => {
    if (isLoading || !isFetched) return 0;
    if (!contractCheckpoints) return 0;

    // Count consecutive earned checkpoints from the most recent epoch
    let streak = 0;
    for (const checkpoint of epochSortedCheckpoints) {
      if (checkpoint.earned) {
        streak++;
      } else {
        break; // Stop at the first non-earned checkpoint
      }
    }

    return streak;
  }, [isLoading, isFetched, contractCheckpoints, epochSortedCheckpoints]);

  useEffect(() => {
    serviceNftTokenId && refetch();
  }, [refetch, serviceNftTokenId]);

  return {
    isError,
    isFetched,
    isLoading,
    totalRewards,
    latestRewardStreak,
    refetch,
    allCheckpoints: epochSortedCheckpoints,
    contractCheckpoints,
    recentStakingContractAddress,
  };
};
