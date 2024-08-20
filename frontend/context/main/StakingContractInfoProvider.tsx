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
import { StakingProgram } from '@/enums/StakingProgram';
import { AutonolasService } from '@/service/Autonolas';
import { StakingContractInfo } from '@/types/Autonolas';

import { ServicesContext } from './ServicesProvider';
import { StakingProgramContext } from './StakingProgramContext';

type StakingContractInfoContextProps = {
  updateActiveStakingContractInfo: () => Promise<void>;
  activeStakingContractInfo?: StakingContractInfo;
  stakingContractInfoRecord?: Record<
    StakingProgram,
    Partial<StakingContractInfo>
  >;
};

export const StakingContractInfoContext =
  createContext<StakingContractInfoContextProps>({
    updateActiveStakingContractInfo: async () => {},
    activeStakingContractInfo: undefined,
    stakingContractInfoRecord: undefined,
  });

export const StakingContractInfoProvider = ({
  children,
}: PropsWithChildren) => {
  const { services } = useContext(ServicesContext);
  const { activeStakingProgram } = useContext(StakingProgramContext);

  const [activeStakingContractInfo, setActiveStakingContractInfo] =
    useState<StakingContractInfo>();

  const [stakingContractInfoRecord, setStakingContractInfoRecord] =
    useState<Record<StakingProgram, Partial<StakingContractInfo>>>();

  const serviceId = useMemo(
    () => services?.[0]?.chain_configs[CHAINS.GNOSIS.chainId].chain_data?.token,
    [services],
  );

  // ACTIVE staking contract info should be updated on interval
  // it requires serviceId and activeStakingProgram
  const updateActiveStakingContractInfo = useCallback(async () => {
    if (!serviceId) return;
    if (!activeStakingProgram) return;

    AutonolasService.getStakingContractInfoByServiceIdStakingProgram(
      serviceId,
      activeStakingProgram,
    ).then(setActiveStakingContractInfo);
  }, [activeStakingProgram, serviceId]);

  useInterval(updateActiveStakingContractInfo, FIVE_SECONDS_INTERVAL);

  // Record of staking contract info for each staking program
  // not user/service specific
  const updateStakingContractInfoRecord = () => {
    const alpha = AutonolasService.getStakingContractInfoByStakingProgram(
      StakingProgram.Alpha,
    );
    const beta = AutonolasService.getStakingContractInfoByStakingProgram(
      StakingProgram.Beta,
    );

    Promise.all([alpha, beta]).then((values) => {
      const [alphaInfo, betaInfo] = values;
      setStakingContractInfoRecord({
        [StakingProgram.Alpha]: alphaInfo,
        [StakingProgram.Beta]: betaInfo,
      });
    });
  };

  useEffect(() => {
    // Load staking contract info record on mount
    updateStakingContractInfoRecord();
  }, []);

  return (
    <StakingContractInfoContext.Provider
      value={{
        updateActiveStakingContractInfo,
        activeStakingContractInfo,
        stakingContractInfoRecord,
      }}
    >
      {children}
    </StakingContractInfoContext.Provider>
  );
};
