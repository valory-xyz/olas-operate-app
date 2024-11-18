import {
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useInterval } from 'usehooks-ts';

import { CHAIN_CONFIG } from '@/config/chains';
import { FIVE_SECONDS_INTERVAL } from '@/constants/intervals';
import { StakingProgramId } from '@/enums/StakingProgram';
import { AutonolasService } from '@/service/Autonolas';
import { StakingContractInfo } from '@/types/Autonolas';

import { ServicesContext } from './ServicesProvider';
import {
  DEFAULT_STAKING_PROGRAM_ID,
  StakingProgramContext,
} from './StakingProgramProvider';
import { ChainId } from '@/enums/Chain';

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

export const StakingContractInfoContext =
  createContext<StakingContractInfoContextProps>({
    activeStakingContractInfo: undefined,
    isPaused: false,
    isStakingContractInfoRecordLoaded: false,
    isActiveStakingContractInfoLoaded: false,
    stakingContractInfoRecord: undefined,
    updateActiveStakingContractInfo: async () => { },
    setIsPaused: () => { },
  });

export const StakingContractInfoProvider = ({
  children,
}: PropsWithChildren) => {
  const { services } = useContext(ServicesContext);
  const { activeStakingProgramId } = useContext(StakingProgramContext);

  const [isPaused, setIsPaused] = useState(false);
  const [
    isStakingContractInfoRecordLoaded,
    setIsStakingContractInfoRecordLoaded,
  ] = useState(false);
  const [
    isActiveStakingContractInfoLoaded,
    setIsActiveStakingContractInfoLoaded,
  ] = useState(false);

  const [activeStakingContractInfo, setActiveStakingContractInfo] =
    useState<Partial<StakingContractInfo>>();

  const [stakingContractInfoRecord, setStakingContractInfoRecord] =
    useState<Record<StakingProgramId, Partial<StakingContractInfo>>>();

  const serviceId = useMemo(
    () =>
      services?.[0]?.chain_configs[CHAIN_CONFIG[ChainId.Optimism].middlewareChain].chain_data?.token,
    [services],
  );

  /** Updates staking contract info specific to the actively staked service owned by the user */
  const updateActiveStakingContractInfo = useCallback(async () => {
    if (!serviceId) return;
    if (!activeStakingProgramId) return;

    AutonolasService.getStakingContractInfoByServiceIdStakingProgram(
      serviceId,
      activeStakingProgramId,
    ).then(setActiveStakingContractInfo);

    setIsActiveStakingContractInfoLoaded(true);
  }, [activeStakingProgramId, serviceId]);

  /** Updates general staking contract information, not user or service specific */
  const updateStakingContractInfoRecord = async () => {
    const stakingPrograms = Object.values([DEFAULT_STAKING_PROGRAM_ID]);

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
      await updateActiveStakingContractInfo().catch(console.error);
    },
    isPaused ? null : FIVE_SECONDS_INTERVAL,
  );

  return (
    <StakingContractInfoContext.Provider
      value={{
        activeStakingContractInfo,
        isStakingContractInfoRecordLoaded,
        isActiveStakingContractInfoLoaded,
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
