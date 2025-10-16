import { isEmpty, isNil } from 'lodash';
import { useMemo } from 'react';

import { STAKING_PROGRAMS } from '@/config/stakingPrograms';
import { TokenSymbolMap } from '@/constants/token';
import {
  useBalanceContext,
  useMasterBalances,
} from '@/hooks/useBalanceContext';
import { useServices } from '@/hooks/useServices';
import { useStakingProgram } from '@/hooks/useStakingProgram';
import { asMiddlewareChain } from '@/utils/middlewareHelpers';
import { isValidServiceId } from '@/utils/service';

export const useShouldAllowSwitch = () => {
  const { isLoaded: isBalanceLoaded, totalStakedOlasBalance } =
    useBalanceContext();
  const { masterSafeBalances } = useMasterBalances();
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
    if (isNil(masterSafeBalances) || isEmpty(masterSafeBalances)) return 0;
    return masterSafeBalances.reduce(
      (acc, { evmChainId: chainId, symbol, balance }) => {
        if (chainId === homeChainId && symbol === TokenSymbolMap.OLAS)
          return acc + balance;
        return acc;
      },
      0,
    );
  }, [homeChainId, isBalanceLoaded, masterSafeBalances]);

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
