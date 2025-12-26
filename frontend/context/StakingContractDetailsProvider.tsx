import { Query, useQueries, useQuery } from '@tanstack/react-query';
import { Maybe } from 'graphql/jsutils/Maybe';
import {
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useCallback,
  useContext,
  useState,
} from 'react';

import {
  FIVE_SECONDS_INTERVAL,
  REACT_QUERY_KEYS,
  StakingProgramId,
  THIRTY_SECONDS_INTERVAL,
} from '@/constants';
import {
  useDynamicRefetchInterval,
  useService,
  useServices,
  useStakingProgram,
} from '@/hooks';
import {
  Optional,
  ServiceStakingDetails,
  StakingContractDetails,
} from '@/types';
import { isValidServiceId } from '@/utils';

import { StakingProgramContext } from './StakingProgramProvider';

/**
 * hook to get all staking contract details
 */
const useAllStakingContractDetails = () => {
  const { allStakingProgramIds } = useStakingProgram();
  const { selectedAgentConfig } = useServices();
  const refetchInterval = useDynamicRefetchInterval(THIRTY_SECONDS_INTERVAL);

  const { serviceApi, evmHomeChainId } = selectedAgentConfig;

  const queryResults = useQueries({
    queries: allStakingProgramIds.map((programId) => ({
      queryKey: REACT_QUERY_KEYS.ALL_STAKING_CONTRACT_DETAILS(
        evmHomeChainId,
        programId,
      ),
      queryFn: async () =>
        serviceApi.getStakingContractDetails(
          programId as StakingProgramId,
          evmHomeChainId,
        ),
      onError: (error: Error) => {
        console.error(
          `Error fetching staking details for ${programId}:`,
          error,
        );
      },
      refetchInterval: (
        query: Query<Optional<StakingContractDetails>, Error>,
      ) => {
        /**
         * Condition applies to individual queries,
         * only refetch if data for that query hasn't been fetched yet
         */
        if (query.state.status === 'success') return false;
        return refetchInterval;
      },
      refetchIntervalInBackground: true,
    })),
  });

  // Aggregate results into a record
  const allStakingContractDetailsRecord = allStakingProgramIds.reduce(
    (record, programId, index) => {
      const query = queryResults[index];
      if (query.status === 'success') {
        if (query.data) {
          record[programId] = query.data;
        }
      } else if (query.status === 'error') {
        console.error(query.error);
      }
      return record;
    },
    {} as Record<string, Partial<StakingContractDetails>>,
  );

  // TODO: some are failing, not sure why.
  const isAllStakingContractDetailsLoaded = queryResults.some(
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
  const refetchInterval = useDynamicRefetchInterval(FIVE_SECONDS_INTERVAL);
  const { serviceApi, evmHomeChainId } = selectedAgentConfig;

  return useQuery({
    queryKey: REACT_QUERY_KEYS.STAKING_CONTRACT_DETAILS_BY_STAKING_PROGRAM_KEY(
      evmHomeChainId,
      serviceNftTokenId!,
      stakingProgramId!,
    ),
    queryFn: async () => {
      /**
       * Request staking contract details
       * if service is present, request its info and states on the staking contract
       */
      const promises: Promise<
        StakingContractDetails | ServiceStakingDetails | undefined
      >[] = [
        serviceApi.getStakingContractDetails(stakingProgramId!, evmHomeChainId),
      ];

      if (isValidServiceId(serviceNftTokenId!)) {
        promises.push(
          serviceApi.getServiceStakingDetails(
            serviceNftTokenId!,
            stakingProgramId!,
            evmHomeChainId,
          ),
        );
      }

      return Promise.allSettled(promises).then((results) => {
        const [stakingContractDetails, serviceStakingDetails] = results;
        return {
          ...(stakingContractDetails?.status === 'fulfilled'
            ? (stakingContractDetails.value as StakingContractDetails)
            : {}),
          ...(serviceStakingDetails?.status === 'fulfilled'
            ? (serviceStakingDetails.value as ServiceStakingDetails)
            : {}),
        };
      });
    },
    enabled: !isPaused && !!stakingProgramId,
    refetchInterval: isPaused ? false : refetchInterval,
    refetchIntervalInBackground: !isPaused,
  });
};

type StakingContractDetailsContextProps = {
  selectedStakingContractDetails: Maybe<
    Partial<StakingContractDetails & ServiceStakingDetails>
  >;
  isSelectedStakingContractDetailsLoading: boolean;
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
    isSelectedStakingContractDetailsLoading: false,
    selectedStakingContractDetails: null,
    isAllStakingContractDetailsRecordLoaded: false,
    refetchSelectedStakingContractDetails: async () => {},
    isPaused: false,
    setIsPaused: () => {},
  });

/**
 * Provider for staking contract details
 */
export const StakingContractDetailsProvider = ({
  children,
}: PropsWithChildren) => {
  const [isPaused, setIsPaused] = useState(false);
  const { selectedService } = useServices();
  const { serviceNftTokenId } = useService(selectedService?.service_config_id);
  const { selectedStakingProgramId } = useContext(StakingProgramContext);

  const {
    data: selectedStakingContractDetails,
    isLoading,
    refetch,
  } = useStakingContractDetailsByStakingProgram({
    serviceNftTokenId,
    stakingProgramId: selectedStakingProgramId,
    isPaused,
  });

  const { allStakingContractDetailsRecord, isAllStakingContractDetailsLoaded } =
    useAllStakingContractDetails();

  const refetchSelectedStakingContractDetails = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return (
    <StakingContractDetailsContext.Provider
      value={{
        // selected staking contract details
        selectedStakingContractDetails,
        isSelectedStakingContractDetailsLoading: isLoading,
        refetchSelectedStakingContractDetails,

        // all staking contract details
        isAllStakingContractDetailsRecordLoaded:
          isAllStakingContractDetailsLoaded,
        allStakingContractDetailsRecord,

        // pause state
        isPaused,
        setIsPaused,
      }}
    >
      {children}
    </StakingContractDetailsContext.Provider>
  );
};
