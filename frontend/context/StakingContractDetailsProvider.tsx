import { useQueries, useQuery } from '@tanstack/react-query';
import {
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
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
import { StakingContractInfo } from '@/types/Autonolas';

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
      return await currentAgent.serviceApi.getStakingContractInfoByServiceIdStakingProgram(
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
        await currentAgent.serviceApi.getStakingContractInfoByStakingProgram(
          programId,
          currentChainId,
        ),
      onError: (error: Error) => {
        console.error(`Error fetching staking info for ${programId}:`, error);
      },
    })),
  });

  // Aggregate results into a record
  const allStakingContractDetails = stakingPrograms.reduce(
    (record, programId, index) => {
      const query = queryResults[index];
      if (query.status === 'success') {
        record[programId] = query.data;
      } else if (query.status === 'error') {
        console.error(query.error);
      }
      return record;
    },
    {} as Record<string, Partial<StakingContractInfo>>,
  );

  const isAllStakingContractDetailsLoaded = queryResults.every(
    (query) => query.isSuccess,
  );

  return { allStakingContractDetails, isAllStakingContractDetailsLoaded };
};

type StakingContractInfoContextProps = {
  activeStakingContractInfo?: Partial<StakingContractInfo>;
  isActiveStakingContractInfoLoaded: boolean;
  isPaused: boolean;
  stakingContractInfoRecord?: Record<
    StakingProgramId,
    Partial<StakingContractInfo>
  >;
  isStakingContractInfoRecordLoaded: boolean;
  updateActiveStakingContractInfo: () => Promise<void>;
  setIsPaused: Dispatch<SetStateAction<boolean>>;
};

/**
 * Context for staking contract details
 */
export const StakingContractInfoContext =
  createContext<StakingContractInfoContextProps>({
    activeStakingContractInfo: undefined,
    isPaused: false,
    isStakingContractInfoRecordLoaded: false,
    isActiveStakingContractInfoLoaded: false,
    stakingContractInfoRecord: undefined,
    updateActiveStakingContractInfo: async () => {},
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
    data: activeStakingContractInfo,
    isLoading: isActiveStakingContractInfoLoading,
    // Updates staking contract info specific to the actively staked
    // service owned by the user
    refetch: updateActiveStakingContractInfo,
  } = useStakingContractDetailsByStakingProgram(isPaused);

  const { allStakingContractDetails, isAllStakingContractDetailsLoaded } =
    useAllStakingContractDetails();

  return (
    <StakingContractInfoContext.Provider
      value={{
        activeStakingContractInfo,
        isStakingContractInfoRecordLoaded: isAllStakingContractDetailsLoaded,
        isActiveStakingContractInfoLoaded:
          !isActiveStakingContractInfoLoading && !!activeStakingContractInfo,
        stakingContractInfoRecord: allStakingContractDetails,
        isPaused,
        setIsPaused,
        updateActiveStakingContractInfo,
      }}
    >
      {children}
    </StakingContractInfoContext.Provider>
  );
};
