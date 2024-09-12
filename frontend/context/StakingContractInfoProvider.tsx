import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useInterval } from 'usehooks-ts';

import { CHAINS } from '@/constants/chains';
import { FIVE_SECONDS_INTERVAL } from '@/constants/intervals';
import { StakingProgramId } from '@/enums/StakingProgram';
import { AutonolasService } from '@/service/Autonolas';
import { StakingContractInfo } from '@/types/Autonolas';

import { ServicesContext } from './ServicesProvider';
import { StakingProgramContext } from './StakingProgramContext';

type StakingContractInfoContextProps = {
  activeStakingContractInfo?: Partial<StakingContractInfo>;
  isStakingContractInfoLoaded: boolean;
  stakingContractInfoRecord?: Record<
    StakingProgramId,
    Partial<StakingContractInfo>
  >;
  updateActiveStakingContractInfo: () => Promise<void>;
};

export const StakingContractInfoContext =
  createContext<StakingContractInfoContextProps>({
    activeStakingContractInfo: undefined,
    isStakingContractInfoLoaded: false,
    stakingContractInfoRecord: undefined,
    updateActiveStakingContractInfo: async () => {},
  });

export const StakingContractInfoProvider = ({
  children,
}: PropsWithChildren) => {
  const { services } = useContext(ServicesContext);
  const { activeStakingProgramId } = useContext(StakingProgramContext);

  const [isStakingContractInfoLoaded, setIsStakingContractInfoLoaded] =
    useState(false);

  const [activeStakingContractInfo, setActiveStakingContractInfo] =
    useState<Partial<StakingContractInfo>>();

  const [stakingContractInfoRecord, setStakingContractInfoRecord] =
    useState<Record<StakingProgramId, Partial<StakingContractInfo>>>();

  const serviceId = useMemo(
    () => services?.[0]?.chain_configs[CHAINS.GNOSIS.chainId].chain_data?.token,
    [services],
  );

  // ACTIVE staking contract info should be updated on interval
  // it requires serviceId and activeStakingProgram
  const updateActiveStakingContractInfo = useCallback(async () => {
    if (!serviceId) return;
    if (!activeStakingProgramId) return;

    AutonolasService.getStakingContractInfoByServiceIdStakingProgram(
      serviceId,
      activeStakingProgramId,
    ).then(setActiveStakingContractInfo);
  }, [activeStakingProgramId, serviceId]);

  useInterval(updateActiveStakingContractInfo, FIVE_SECONDS_INTERVAL);

  // Record of staking contract info for each staking program
  // not user/service specific
  const updateStakingContractInfoRecord = async () => {
    const alpha = AutonolasService.getStakingContractInfoByStakingProgram(
      StakingProgramId.Alpha,
    );
    const beta = AutonolasService.getStakingContractInfoByStakingProgram(
      StakingProgramId.Beta,
    );

    const beta_2 = AutonolasService.getStakingContractInfoByStakingProgram(
      StakingProgramId.Beta2,
    );

    try {
      const [alphaInfo, betaInfo, beta2Info] = await Promise.all([
        alpha,
        beta,
        beta_2,
      ]);
      setStakingContractInfoRecord({
        [StakingProgramId.Alpha]: alphaInfo,
        [StakingProgramId.Beta]: betaInfo,
        [StakingProgramId.Beta2]: beta2Info,
      });
      setIsStakingContractInfoLoaded(true);
    } catch (e) {
      setIsStakingContractInfoLoaded(false);
    }
  };

  useEffect(() => {
    // Load staking contract info record on mount
    updateStakingContractInfoRecord();
  }, []);

  return (
    <StakingContractInfoContext.Provider
      value={{
        activeStakingContractInfo,
        isStakingContractInfoLoaded,
        stakingContractInfoRecord,
        updateActiveStakingContractInfo,
      }}
    >
      {children}
    </StakingContractInfoContext.Provider>
  );
};
