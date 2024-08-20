import { createContext, PropsWithChildren, useCallback, useState } from 'react';
import { useInterval } from 'usehooks-ts';

import { CHAINS } from '@/constants/chains';
import { StakingProgram } from '@/enums/StakingProgram';
import { useServices } from '@/hooks/useServices';
import { AutonolasService } from '@/service/Autonolas';

export const StakingProgramContext = createContext<{
  activeStakingProgram?: StakingProgram | null;
  defaultStakingProgram: StakingProgram;
  updateActiveStakingProgram: () => Promise<void>;
}>({
  activeStakingProgram: undefined,
  defaultStakingProgram: StakingProgram.Beta,
  updateActiveStakingProgram: async () => {},
});

/** Determines the current active staking program, if any */
export const StakingProgramProvider = ({ children }: PropsWithChildren) => {
  const { service } = useServices();

  const [activeStakingProgram, setActiveStakingProgram] =
    useState<StakingProgram | null>();

  const updateActiveStakingProgram = useCallback(async () => {
    // if no service nft, not staked
    const serviceId =
      service?.chain_configs[CHAINS.GNOSIS.chainId].chain_data?.token;

    if (!serviceId) {
      setActiveStakingProgram(null);
      return;
    }

    AutonolasService.getCurrentStakingProgramByServiceId(serviceId).then(
      (stakingProgram) => {
        setActiveStakingProgram(stakingProgram);
      },
    );
  }, [service]);

  useInterval(updateActiveStakingProgram, 5000);

  return (
    <StakingProgramContext.Provider
      value={{
        activeStakingProgram,
        defaultStakingProgram: StakingProgram.Beta,
        updateActiveStakingProgram,
      }}
    >
      {children}
    </StakingProgramContext.Provider>
  );
};
