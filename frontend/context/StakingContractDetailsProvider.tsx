import { useQueries, useQuery } from '@tanstack/react-query';
import {
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useCallback,
  useContext,
  useState,
} from 'react';

import { AGENT_CONFIG } from '@/config/agents';
import { GNOSIS_CHAIN_CONFIG } from '@/config/chains';
import { FIVE_SECONDS_INTERVAL } from '@/constants/intervals';
import { REACT_QUERY_KEYS } from '@/constants/react-query-keys';
import { StakingProgramId } from '@/enums/StakingProgram';
import { useService } from '@/hooks/useService';
import { useServices } from '@/hooks/useServices';
import { StakingContractDetails } from '@/types/Autonolas';

import {
  INITIAL_DEFAULT_STAKING_PROGRAM_ID,
  StakingProgramContext,
} from './StakingProgramProvider';

const currentAgent = AGENT_CONFIG.trader; // TODO: replace with dynamic agent selection
const currentChainId = GNOSIS_CHAIN_CONFIG.chainId; // TODO: replace with dynamic chain selection

const useServiceId = () => {
  const { selectedService, isFetched: isLoaded } = useServices();
  const serviceConfigId =
    isLoaded && selectedService ? selectedService?.service_config_id : '';
  const { service } = useService({ serviceConfigId });
  const serviceId = service?.chain_configs[currentChainId].chain_data?.token;

  return serviceId;
};

/**
 * hook to get staking contract details by staking program
 */
const useStakingContractDetailsByStakingProgram = (isPaused: boolean) => {
  const { activeStakingProgramId } = useContext(StakingProgramContext);
  const serviceId = useServiceId();

  return useQuery({
    queryKey: [
      REACT_QUERY_KEYS.STAKING_CONTRACT_DETAILS_BY_STAKING_PROGRAM_KEY,
      serviceId,
      activeStakingProgramId,
      currentChainId,
    ],
    queryFn: async () => {
      return await currentAgent.serviceApi.getStakingContractDetailsByServiceIdStakingProgram(
        serviceId!,
        activeStakingProgramId!,
        currentChainId,
      );
    },
    enabled: !!serviceId && !!activeStakingProgramId && !isPaused,
    refetchInterval: !isPaused ? FIVE_SECONDS_INTERVAL : false,
    refetchOnWindowFocus: false,
  });
};

/**
 * hook to get all staking contract details
 */
const useAllStakingContractDetails = () => {
  const stakingPrograms = Object.values([INITIAL_DEFAULT_STAKING_PROGRAM_ID]);

  const queryResults = useQueries({
    queries: stakingPrograms.map((programId) => ({
      queryKey: REACT_QUERY_KEYS.ALL_STAKING_CONTRACT_DETAILS(
        programId,
        currentChainId,
      ),
      queryFn: async () =>
        await currentAgent.serviceApi.getStakingContractDetailsByStakingProgram(
          programId,
          currentChainId,
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
  const allStakingContractDetailsList = stakingPrograms.reduce(
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

  return { allStakingContractDetailsList, isAllStakingContractDetailsLoaded };
};

type StakingContractDetailsContextProps = {
  activeStakingContractDetails?: Partial<StakingContractDetails>;
  isActiveStakingContractDetailsLoaded: boolean;
  isPaused: boolean;
  allStakingContractDetailsList?: Record<
    StakingProgramId,
    Partial<StakingContractDetails>
  >;
  isAllStakingContractDetailsListLoaded: boolean;
  refetchActiveStakingContractDetails: () => Promise<void>;
  setIsPaused: Dispatch<SetStateAction<boolean>>;
};

/**
 * Context for staking contract details
 */
export const StakingContractDetailsContext =
  createContext<StakingContractDetailsContextProps>({
    activeStakingContractDetails: undefined,
    isPaused: false,
    isAllStakingContractDetailsListLoaded: false,
    isActiveStakingContractDetailsLoaded: false,
    allStakingContractDetailsList: undefined,
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
    data: activeStakingContractDetails,
    isLoading: isActiveStakingContractDetailsLoading,
    // Updates staking contract info specific to the actively staked
    // service owned by the user
    refetch: refetchActiveStakingContract,
  } = useStakingContractDetailsByStakingProgram(isPaused);

  const { allStakingContractDetailsList, isAllStakingContractDetailsLoaded } =
    useAllStakingContractDetails();

  const refetchActiveStakingContractDetails = useCallback(async () => {
    await refetchActiveStakingContract();
  }, [refetchActiveStakingContract]);

  return (
    <StakingContractDetailsContext.Provider
      value={{
        activeStakingContractDetails,
        isAllStakingContractDetailsListLoaded:
          isAllStakingContractDetailsLoaded,
        isActiveStakingContractDetailsLoaded:
          !isActiveStakingContractDetailsLoading &&
          !!activeStakingContractDetails,
        allStakingContractDetailsList,
        isPaused,
        setIsPaused,
        refetchActiveStakingContractDetails,
      }}
    >
      {children}
    </StakingContractDetailsContext.Provider>
  );
};
