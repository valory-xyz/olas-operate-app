import { isNil } from 'lodash';
import { useMemo } from 'react';

import { STAKING_PROGRAMS } from '@/config/stakingPrograms';
import { TokenSymbolMap } from '@/config/tokens';
import {
  useBalanceContext,
  useMasterBalances,
  useServices,
  useStakingProgram,
} from '@/hooks';
import { asMiddlewareChain, isValidServiceId } from '@/utils';

export const useShouldAllowStakingContractSwitch = () => {
  const { isLoaded: isBalanceLoaded, totalStakedOlasBalance } =
    useBalanceContext();
  const { getMasterSafeOlasBalanceOfInStr } = useMasterBalances();
  const { stakingProgramIdToMigrateTo } = useStakingProgram();
  const {
    selectedAgentConfig,
    selectedService,
    isFetched: isServicesLoaded,
  } = useServices();

  const { evmHomeChainId: homeChainId } = selectedAgentConfig;
  const minimumOlasRequiredToMigrate = useMemo(
    () =>
      STAKING_PROGRAMS[homeChainId][stakingProgramIdToMigrateTo!]
        ?.stakingRequirements[TokenSymbolMap.OLAS],
    [homeChainId, stakingProgramIdToMigrateTo],
  );

  const safeOlasBalance = useMemo(() => {
    if (!isBalanceLoaded) return 0;
    return Number(getMasterSafeOlasBalanceOfInStr(homeChainId) || 0);
  }, [homeChainId, isBalanceLoaded, getMasterSafeOlasBalanceOfInStr]);

  const totalOlas = safeOlasBalance + (totalStakedOlasBalance || 0);
  const hasEnoughOlasToMigrate = totalOlas >= minimumOlasRequiredToMigrate;
  const olasRequiredToMigrate = Math.max(
    minimumOlasRequiredToMigrate - totalOlas,
    0,
  );

  const isFirstDeploy = useMemo(() => {
    if (!isServicesLoaded) return false;

    // check if the service is deployed (has service id assigned)
    const currentChainId = selectedAgentConfig.evmHomeChainId;
    const chainData = !isNil(selectedService?.chain_configs)
      ? selectedService?.chain_configs?.[asMiddlewareChain(currentChainId)]
          ?.chain_data
      : null;
    return !(selectedService && isValidServiceId(chainData?.token));
  }, [isServicesLoaded, selectedAgentConfig.evmHomeChainId, selectedService]);

  const shouldAllowSwitch = useMemo(() => {
    const rules: Array<{ condition: boolean }> = [
      {
        condition:
          isFirstDeploy && safeOlasBalance < minimumOlasRequiredToMigrate,
      },
      {
        condition: !isFirstDeploy && !hasEnoughOlasToMigrate,
      },
    ];

    return !rules.some((rule) => rule.condition);
  }, [
    isFirstDeploy,
    safeOlasBalance,
    minimumOlasRequiredToMigrate,
    hasEnoughOlasToMigrate,
  ]);

  return {
    totalOlas,
    olasRequiredToMigrate,
    shouldAllowSwitch,
  };
};
