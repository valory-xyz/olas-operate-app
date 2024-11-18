import { useQueries } from '@tanstack/react-query';
import {
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useCallback,
  useContext,
  useState,
} from 'react';

import { REACT_QUERY_KEYS } from '@/constants/react-query-keys';
import { StakingProgramId } from '@/enums/StakingProgram';
import { useAgent } from '@/hooks/useAgent';
import { useChainId } from '@/hooks/useChainId';
import { useStakingContractDetailsByStakingProgram } from '@/hooks/useStakingContractDetails';
import { StakingContractDetails } from '@/types/Autonolas';

import {
  INITIAL_DEFAULT_STAKING_PROGRAM_ID,
  StakingProgramContext,
} from './StakingProgramProvider';

/**
 * hook to get all staking contract details
 */
const useAllStakingContractDetails = () => {
  const stakingPrograms = [INITIAL_DEFAULT_STAKING_PROGRAM_ID];
  const chainId = useChainId();
  const currentAgent = useAgent();

  const queryResults = useQueries({
    queries: stakingPrograms.map((programId) => ({
      queryKey: REACT_QUERY_KEYS.ALL_STAKING_CONTRACT_DETAILS(
        chainId,
        programId,
      ),
      queryFn: async () =>
        await currentAgent.serviceApi.getStakingContractDetailsByName(
          programId,
          chainId,
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
  const allStakingContractDetailsRecord = stakingPrograms.reduce(
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

type StakingContractDetailsContextProps = {
  activeStakingContractDetails?: Partial<StakingContractDetails>;
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
    activeStakingContractDetails: undefined,
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

  const { activeStakingProgramId } = useContext(StakingProgramContext);
  const {
    data: activeStakingContractDetails,
    isLoading: isActiveStakingContractDetailsLoading,
    refetch: refetchActiveStakingContract,
  } = useStakingContractDetailsByStakingProgram(
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
