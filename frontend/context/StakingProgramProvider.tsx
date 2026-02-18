import { isNil } from 'lodash';
import {
  createContext,
  PropsWithChildren,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { StakingProgramId } from '@/constants';
import { useActiveStakingProgramId, useServices } from '@/hooks';
import { Maybe, Nullable } from '@/types';

export const StakingProgramContext = createContext<{
  isActiveStakingProgramLoaded: boolean;
  activeStakingProgramId?: Maybe<StakingProgramId>;
  defaultStakingProgramId?: Maybe<StakingProgramId>;
  selectedStakingProgramId: Nullable<StakingProgramId>;
  setDefaultStakingProgramId: (stakingProgramId: StakingProgramId) => void;
  stakingProgramIdToMigrateTo: Nullable<StakingProgramId>;
  setStakingProgramIdToMigrateTo: (
    stakingProgramId: Nullable<StakingProgramId>,
  ) => void;
}>({
  isActiveStakingProgramLoaded: false,
  selectedStakingProgramId: null,
  setDefaultStakingProgramId: () => {},
  stakingProgramIdToMigrateTo: null,
  setStakingProgramIdToMigrateTo: () => {},
});

/**
 * context provider responsible for determining the current active staking program based on the service.
 * It does so by checking if the current service is staked, and if so, which staking program it is staked in.
 * It also provides a method to update the active staking program id in state.
 *
 * @note When the service is not yet deployed, a default staking program state is used to allow switching
 * between staking programs before deployment is complete, ensuring the relevant staking program is displayed,
 * even if deployment is still in progress
 */
export const StakingProgramProvider = ({ children }: PropsWithChildren) => {
  const { selectedService, selectedAgentConfig } = useServices();

  const [defaultStakingProgramId, setDefaultStakingProgramId] = useState(
    selectedAgentConfig.defaultStakingProgramId,
  );

  const [stakingProgramIdToMigrateTo, setStakingProgramIdToMigrateTo] =
    useState<Nullable<StakingProgramId>>(null);

  useEffect(() => {
    setDefaultStakingProgramId(selectedAgentConfig.defaultStakingProgramId);
  }, [selectedAgentConfig]);

  const serviceNftTokenId = isNil(selectedService?.chain_configs)
    ? null
    : selectedService.chain_configs?.[selectedService?.home_chain]?.chain_data
        ?.token;

  const { isLoading, data: activeStakingProgramId } = useActiveStakingProgramId(
    serviceNftTokenId,
    selectedAgentConfig,
  );

  // Determine the staking program ID in the following order:
  // 1) On-chain value (where the user actually staked)
  // 2) If not available, use the selected service (can be updated during migration)
  // 3) Fall back to the default config value
  const selectedStakingProgramId = useMemo(() => {
    if (isLoading) return null;

    const serviceSelectedStakingProgramId =
      selectedService?.chain_configs?.[selectedService?.home_chain]?.chain_data
        ?.user_params?.staking_program_id;

    return (
      activeStakingProgramId ||
      serviceSelectedStakingProgramId ||
      defaultStakingProgramId
    );
  }, [
    isLoading,
    activeStakingProgramId,
    selectedService,
    defaultStakingProgramId,
  ]);

  return (
    <StakingProgramContext.Provider
      value={{
        isActiveStakingProgramLoaded: !isLoading,
        activeStakingProgramId,
        defaultStakingProgramId,
        selectedStakingProgramId,
        setDefaultStakingProgramId,
        stakingProgramIdToMigrateTo,
        setStakingProgramIdToMigrateTo,
      }}
    >
      {children}
    </StakingProgramContext.Provider>
  );
};
