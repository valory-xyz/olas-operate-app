import { useQuery } from '@tanstack/react-query';
import {
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useInterval } from 'usehooks-ts';

import { AGENT_CONFIG } from '@/config/agents';
import { GNOSIS_CHAIN_CONFIG } from '@/config/chains';
import { FIVE_SECONDS_INTERVAL } from '@/constants/intervals';
import { REACT_QUERY_KEYS } from '@/constants/react-query-keys';
import { StakingProgramId } from '@/enums/StakingProgram';
import { useService } from '@/hooks/useService';
import { useServices } from '@/hooks/useServices';
import { AutonolasService } from '@/service/Autonolas';
import { StakingContractInfo } from '@/types/Autonolas';

import {
  INITIAL_DEFAULT_STAKING_PROGRAM_ID,
  StakingProgramContext,
} from './StakingProgramProvider';

const currentAgent = AGENT_CONFIG.trader; // TODO: replace with dynamic agent selection
const currentChainId = GNOSIS_CHAIN_CONFIG.chainId; // TODO: replace with dynamic chain selection

/**
 * hook to get staking contract details by staking program
 */
const useStakingContractDetailsByStakingProgram = (isPaused: boolean) => {
  const { activeStakingProgramId } = useContext(StakingProgramContext);

  const { selectedService, isFetched: isLoaded } = useServices();
  const serviceConfigId =
    isLoaded && selectedService ? selectedService?.service_config_id : '';
  const { service } = useService({ serviceConfigId });
  const serviceId = service?.chain_configs[currentChainId].chain_data?.token;

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
    enabled: !!service && !!activeStakingProgramId && !isPaused,
    refetchInterval: isLoaded && !isPaused ? FIVE_SECONDS_INTERVAL : false,
    refetchOnWindowFocus: false,
  });
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
  const [
    isStakingContractInfoRecordLoaded,
    setIsStakingContractInfoRecordLoaded,
  ] = useState(false);

  const {
    data: activeStakingContractInfo,
    isLoading: isActiveStakingContractInfoLoading,
    // Updates staking contract info specific to the actively staked
    // service owned by the user
    refetch: updateActiveStakingContractInfo,
  } = useStakingContractDetailsByStakingProgram(isPaused);

  const [stakingContractInfoRecord, setStakingContractInfoRecord] =
    useState<Record<StakingProgramId, Partial<StakingContractInfo>>>();

  /** Updates general staking contract information, not user or service specific */
  const updateStakingContractInfoRecord = async () => {
    const stakingPrograms = Object.values([INITIAL_DEFAULT_STAKING_PROGRAM_ID]);

    try {
      const stakingInfoPromises = stakingPrograms.map((programId) =>
        AutonolasService.getStakingContractInfoByStakingProgram(programId),
      );

      const stakingInfos = await Promise.allSettled(stakingInfoPromises);

      const stakingContractInfoRecord = stakingPrograms.reduce(
        (record, programId, index) => {
          if (stakingInfos[index].status === 'rejected') {
            console.error(stakingInfos[index].reason);
            return record;
          }
          record[programId] = stakingInfos[index].value;
          return record;
        },
        {} as Record<string, Partial<StakingContractInfo>>,
      );

      setStakingContractInfoRecord(stakingContractInfoRecord);
      setIsStakingContractInfoRecordLoaded(true);
    } catch (e) {
      console.error({ e });
    }
  };

  useEffect(() => {
    updateStakingContractInfoRecord().catch(console.error);
  }, []);

  useInterval(
    async () => {
      await updateStakingContractInfoRecord().catch(console.error);
    },
    isPaused ? null : FIVE_SECONDS_INTERVAL,
  );

  return (
    <StakingContractInfoContext.Provider
      value={{
        activeStakingContractInfo,
        isStakingContractInfoRecordLoaded,
        isActiveStakingContractInfoLoaded:
          !isActiveStakingContractInfoLoading && !!activeStakingContractInfo,
        stakingContractInfoRecord,
        isPaused,
        setIsPaused,
        updateActiveStakingContractInfo,
      }}
    >
      {children}
    </StakingContractInfoContext.Provider>
  );
};
