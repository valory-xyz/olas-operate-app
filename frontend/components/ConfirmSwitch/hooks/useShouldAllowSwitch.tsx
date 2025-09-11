import { isEmpty, isNil } from 'lodash';
import { useMemo } from 'react';

import { STAKING_PROGRAMS } from '@/config/stakingPrograms';
import { TokenSymbolMap } from '@/constants/token';
import {
  useBalanceContext,
  useMasterBalances,
} from '@/hooks/useBalanceContext';
import { useNeedsFunds } from '@/hooks/useNeedsFunds';
import { useServices } from '@/hooks/useServices';
import { useStakingProgram } from '@/hooks/useStakingProgram';
import { asMiddlewareChain } from '@/utils/middlewareHelpers';
import { isValidServiceId } from '@/utils/service';

export enum NotAllowedSwitchReason {
  InsufficientOlasBalance = 'Insufficient OLAS balance',
  InsufficientNativeTokenBalance = 'Insufficient native token balance',
}

type ShouldAllowSwitch =
  | { allowSwitch: false; reason: NotAllowedSwitchReason }
  | { allowSwitch: true; reason: null };

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
  const { hasEnoughNativeTokenForInitialFunding } = useNeedsFunds(
    stakingProgramIdToMigrateTo,
  );

  const { evmHomeChainId: homeChainId } = selectedAgentConfig;
  const minimumOlasRequiredToMigrate = useMemo(
    () =>
      STAKING_PROGRAMS[homeChainId][stakingProgramIdToMigrateTo!]
        ?.stakingRequirements[TokenSymbolMap.OLAS],
    [homeChainId, stakingProgramIdToMigrateTo],
  );

  const isFirstDeploy = useMemo(() => {
    if (!isServicesLoaded) return false;

    // check if the service is deployed (has service id assigned)
    const currentChainId = selectedAgentConfig.evmHomeChainId;
    const chainData = !isNil(selectedService?.chain_configs)
      ? selectedService?.chain_configs?.[asMiddlewareChain(currentChainId)]
          ?.chain_data
      : null;
    const token = chainData?.token;
    if (selectedService && isValidServiceId(token)) return false;

    return true;
  }, [isServicesLoaded, selectedAgentConfig.evmHomeChainId, selectedService]);

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
  const olasRequiredToMigrate = minimumOlasRequiredToMigrate - totalOlas;

  const shouldAllowSwitch: ShouldAllowSwitch = useMemo(() => {
    if (isFirstDeploy) {
      if (safeOlasBalance < minimumOlasRequiredToMigrate) {
        return {
          allowSwitch: false,
          reason: NotAllowedSwitchReason.InsufficientOlasBalance,
        };
      }
      if (!hasEnoughNativeTokenForInitialFunding) {
        return {
          allowSwitch: false,
          reason: NotAllowedSwitchReason.InsufficientNativeTokenBalance,
        };
      }
      return {
        allowSwitch: true,
        reason: null,
      };
    } else if (!hasEnoughOlasToMigrate) {
      return {
        allowSwitch: false,
        reason: NotAllowedSwitchReason.InsufficientOlasBalance,
      };
    }
    return {
      allowSwitch: true,
      reason: null,
    };
  }, [
    isFirstDeploy,
    safeOlasBalance,
    minimumOlasRequiredToMigrate,
    hasEnoughNativeTokenForInitialFunding,
    hasEnoughOlasToMigrate,
  ]);

  return {
    totalOlas,
    olasRequiredToMigrate,
    shouldAllowSwitch,
  };
};
