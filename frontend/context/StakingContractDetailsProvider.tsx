import { useQueries, useQuery } from '@tanstack/react-query';
import { Maybe } from 'graphql/jsutils/Maybe';
import { isNil } from 'lodash';
import {
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useCallback,
  useContext,
  useState,
} from 'react';

import { FIVE_SECONDS_INTERVAL } from '@/constants/intervals';
import { REACT_QUERY_KEYS } from '@/constants/react-query-keys';
import { StakingProgramId } from '@/enums/StakingProgram';
import { useServices } from '@/hooks/useServices';
import { useStakingProgram } from '@/hooks/useStakingProgram';
import { StakingContractDetails } from '@/types/Autonolas';
import { asMiddlewareChain } from '@/utils/middlewareHelpers';

import { StakingProgramContext } from './StakingProgramProvider';

/**
 * hook to get all staking contract details
 */
const useAllStakingContractDetails = () => {
  const { allStakingProgramIds } = useStakingProgram();
  const { selectedAgentConfig } = useServices();
  const { serviceApi, evmHomeChainId: homeChainId } = selectedAgentConfig;

  const queryResults = useQueries({
    queries: allStakingProgramIds.map((programId) => ({
      queryKey: REACT_QUERY_KEYS.ALL_STAKING_CONTRACT_DETAILS(
        homeChainId,
        programId,
      ),
      queryFn: async () =>
        await serviceApi.getStakingContractDetailsByStakingProgramId(
          programId as StakingProgramId,
          homeChainId,
        ),
      onError: (error: Error) => {
        console.error(
          `Error fetching staking details for ${programId}:`,
          error,
        );
      },
    })),
  });

  // Aggregate results into a record
  const allStakingContractDetailsRecord = allStakingProgramIds.reduce(
    (record, programId, index) => {
      const query = queryResults[index];
      if (query.status === 'success') {
        record[programId] = query.data;
      } else if (query.status === 'error') {
        console.error(query.error);
      }
      return record;
    },
    {} as Record<string, Partial<StakingContractDetails>>,
  );

  const isAllStakingContractDetailsLoaded = queryResults.every(
    (query) => query.isSuccess,
  );

  return { allStakingContractDetailsRecord, isAllStakingContractDetailsLoaded };
};

/**
 * hook to get staking contract details by staking program
 */
const useStakingContractDetailsByStakingProgram = ({
  serviceNftTokenId,
  stakingProgramId,
  isPaused,
}: {
  serviceNftTokenId: Maybe<number>;
  stakingProgramId: Maybe<StakingProgramId>;
  isPaused?: boolean;
}) => {
  const { selectedAgentConfig } = useServices();
  const { serviceApi, evmHomeChainId } = selectedAgentConfig;
  return useQuery({
    queryKey: REACT_QUERY_KEYS.STAKING_CONTRACT_DETAILS_BY_STAKING_PROGRAM_KEY(
      evmHomeChainId,
      serviceNftTokenId!,
      stakingProgramId!,
    ),
    queryFn: async () => {
      if (isNil(serviceNftTokenId))
        return serviceApi.getStakingContractDetailsByStakingProgramId(
          stakingProgramId!,
          evmHomeChainId,
        );
      return serviceApi.getStakingContractDetailsByServiceIdStakingProgram(
        serviceNftTokenId!,
        stakingProgramId!,
        evmHomeChainId,
      );
    },
    enabled: !isPaused && !!serviceNftTokenId && !!stakingProgramId,
    refetchInterval: !isPaused ? FIVE_SECONDS_INTERVAL : false,
    refetchOnWindowFocus: false,
  });
};

type StakingContractDetailsContextProps = {
  selectedStakingContractDetails: Partial<Maybe<StakingContractDetails>>;
  isSelectedStakingContractDetailsLoaded: boolean;
  isPaused: boolean;
  allStakingContractDetailsRecord?: Record<
    StakingProgramId,
    Partial<StakingContractDetails>
  >;
  isAllStakingContractDetailsRecordLoaded: boolean;
  refetchSelectedStakingContractDetails: () => Promise<void>;
  setIsPaused: Dispatch<SetStateAction<boolean>>;
};

/**
 * Context for staking contract details
 */
export const StakingContractDetailsContext =
  createContext<StakingContractDetailsContextProps>({
    selectedStakingContractDetails: null,
    isPaused: false,
    isAllStakingContractDetailsRecordLoaded: false,
    isSelectedStakingContractDetailsLoaded: false,
    refetchSelectedStakingContractDetails: async () => {},
    setIsPaused: () => {},
  });

/**
 * Provider for staking contract details
 */
export const StakingContractDetailsProvider = ({
  children,
}: PropsWithChildren) => {
  const [isPaused, setIsPaused] = useState(false);
  const { selectedService, selectedAgentConfig } = useServices();

  const { selectedStakingProgramId } = useContext(StakingProgramContext);

  const {
    data: selectedStakingContractDetails,
    isFetched,
    refetch,
  } = useStakingContractDetailsByStakingProgram({
    serviceNftTokenId: !isNil(selectedService?.service_config_id)
      ? selectedService?.chain_configs?.[
          asMiddlewareChain(selectedAgentConfig.evmHomeChainId)
        ].chain_data.token
      : null,
    stakingProgramId: selectedStakingProgramId,
  });

  const { allStakingContractDetailsRecord, isAllStakingContractDetailsLoaded } =
    useAllStakingContractDetails();

  const refetchSelectedStakingContractDetails = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return (
    <StakingContractDetailsContext.Provider
      value={{
        selectedStakingContractDetails,
        isSelectedStakingContractDetailsLoaded: isFetched,
        isAllStakingContractDetailsRecordLoaded:
          isAllStakingContractDetailsLoaded,
        allStakingContractDetailsRecord,
        isPaused,
        setIsPaused,
        refetchSelectedStakingContractDetails,
      }}
    >
      {children}
    </StakingContractDetailsContext.Provider>
  );
};
