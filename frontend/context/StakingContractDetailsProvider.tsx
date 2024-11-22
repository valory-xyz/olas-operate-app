import { useQueries, useQuery } from '@tanstack/react-query';
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

import { FIVE_SECONDS_INTERVAL } from '@/constants/intervals';
import { REACT_QUERY_KEYS } from '@/constants/react-query-keys';
import { StakingProgramId } from '@/enums/StakingProgram';
import { useService } from '@/hooks/useService';
import { useServices } from '@/hooks/useServices';
import { useStakingProgram } from '@/hooks/useStakingProgram';
import { StakingContractDetails } from '@/types/Autonolas';

import { StakingProgramContext } from './StakingProgramProvider';

/**
 * hook to get all staking contract details
 */
const useAllStakingContractDetails = () => {
  const { allStakingProgramIds } = useStakingProgram();
  const { selectedAgentConfig } = useServices();
  const { serviceApi, homeChainId } = selectedAgentConfig;

  const queryResults = useQueries({
    queries: allStakingProgramIds.map((programId) => ({
      queryKey: REACT_QUERY_KEYS.ALL_STAKING_CONTRACT_DETAILS(
        homeChainId,
        programId,
      ),
      queryFn: async () =>
        await serviceApi.getStakingContractDetailsByName(
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
const useStakingContractDetailsByStakingProgram = (
  serviceId: Maybe<number>,
  stakingProgramId: Maybe<StakingProgramId>,
  isPaused?: boolean,
) => {
  const { selectedAgentConfig } = useServices();
  const { serviceApi, homeChainId: chainId } = selectedAgentConfig;
  return useQuery({
    queryKey: REACT_QUERY_KEYS.STAKING_CONTRACT_DETAILS_BY_STAKING_PROGRAM_KEY(
      chainId,
      serviceId!,
      stakingProgramId!,
    ),
    queryFn: async () => {
      return await serviceApi.getStakingContractDetailsByServiceIdStakingProgram(
        serviceId!,
        stakingProgramId!,
        chainId,
      );
    },
    enabled: !!serviceId && !!stakingProgramId && !!chainId && !isPaused,
    refetchInterval: !isPaused ? FIVE_SECONDS_INTERVAL : () => false,
    refetchOnWindowFocus: false,
  });
};

type StakingContractDetailsContextProps = {
  activeStakingContractDetails: Partial<Maybe<StakingContractDetails>>;
  isActiveStakingContractDetailsLoaded: boolean;
  isPaused: boolean;
  allStakingContractDetailsRecord?: Record<
    StakingProgramId,
    Partial<StakingContractDetails>
  >;
  isAllStakingContractDetailsRecordLoaded: boolean;
  refetchActiveStakingContractDetails: () => Promise<void>;
  setIsPaused: Dispatch<SetStateAction<boolean>>;
};

/**
 * Context for staking contract details
 */
export const StakingContractDetailsContext =
  createContext<StakingContractDetailsContextProps>({
    activeStakingContractDetails: null,
    isPaused: false,
    isAllStakingContractDetailsRecordLoaded: false,
    isActiveStakingContractDetailsLoaded: false,
    allStakingContractDetailsRecord: undefined,
    refetchActiveStakingContractDetails: async () => {},
    setIsPaused: () => {},
  });

/**
 * Provider for staking contract details
 */
export const StakingContractDetailsProvider = ({
  children,
}: PropsWithChildren) => {
  const [isPaused, setIsPaused] = useState(false);
  const {
    selectedService,
    selectedAgentConfig,
    isFetched: isLoaded,
  } = useServices();
  const serviceConfigId =
    selectedService?.service_config_id;
  const { service } = useService({ serviceConfigId });
  const serviceId =
    service?.chain_configs?.[selectedAgentConfig?.homeChainId]?.chain_data
      ?.token;

  const { activeStakingProgramId } = useContext(StakingProgramContext);
  const {
    data: activeStakingContractDetails,
    isLoading: isActiveStakingContractDetailsLoading,
    refetch: refetchActiveStakingContract,
  } = useStakingContractDetailsByStakingProgram(
    serviceId,
    activeStakingProgramId,
    isPaused,
  );

  const { allStakingContractDetailsRecord, isAllStakingContractDetailsLoaded } =
    useAllStakingContractDetails();

  const refetchActiveStakingContractDetails = useCallback(async () => {
    await refetchActiveStakingContract();
  }, [refetchActiveStakingContract]);

  return (
    <StakingContractDetailsContext.Provider
      value={{
        activeStakingContractDetails,
        isActiveStakingContractDetailsLoaded:
          !isActiveStakingContractDetailsLoading &&
          !!activeStakingContractDetails,
        isAllStakingContractDetailsRecordLoaded:
          isAllStakingContractDetailsLoaded,
        allStakingContractDetailsRecord,
        isPaused,
        setIsPaused,
        refetchActiveStakingContractDetails,
      }}
    >
      {children}
    </StakingContractDetailsContext.Provider>
  );
};
