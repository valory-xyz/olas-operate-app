import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { useInterval } from 'usehooks-ts';

import { FIVE_SECONDS_INTERVAL } from '@/constants/intervals';
import { AutonolasService } from '@/service/Autonolas';
import { StakingContractInfo } from '@/types/Autonolas';

import { ServicesContext } from './ServicesProvider';

type StakingContractInfoContextProps = {
  updateStakingContractInfo: () => Promise<void>;
  stakingContractInfo?: StakingContractInfo;
};

export const StakingContractInfoContext =
  createContext<StakingContractInfoContextProps>({
    updateStakingContractInfo: async () => {},
    stakingContractInfo: undefined,
  });

export const StakingContractInfoProvider = ({
  children,
}: PropsWithChildren) => {
  const { services } = useContext(ServicesContext);
  const serviceId = useMemo(() => services?.[0]?.chain_data?.token, [services]);

  const [stakingContractInfo, setStakingContractInfo] =
    useState<StakingContractInfo>();

  const updateStakingContractInfo = useCallback(async () => {
    if (!serviceId) return;

    const info = await AutonolasService.getStakingContractInfo(serviceId);
    if (!info) return;

    setStakingContractInfo(info);
  }, [serviceId]);

  useInterval(updateStakingContractInfo, FIVE_SECONDS_INTERVAL);

  return (
    <StakingContractInfoContext.Provider
      value={{
        updateStakingContractInfo,
        stakingContractInfo,
      }}
    >
      {children}
    </StakingContractInfoContext.Provider>
  );
};
