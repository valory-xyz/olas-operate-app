import { Button, message } from 'antd';
import { useMemo } from 'react';
import { useBoolean } from 'usehooks-ts';

import { SETUP_SCREEN, SetupScreen, StakingProgramId } from '@/constants';
import { SERVICE_TEMPLATES } from '@/constants/serviceTemplates';
import {
  useMasterBalances,
  useServices,
  useSetup,
  useStakingProgram,
} from '@/hooks';
import { BalanceService } from '@/service/Balance';
import { WalletBalance } from '@/types';
import { onDummyServiceCreation, updateServiceIfNeeded } from '@/utils';

import { useCanMigrate } from '../hooks/useCanMigrate';

/** Determines which funding screen to route to after staking selection */
const resolveFundingRoute = async (
  serviceConfigId: string,
  walletBalances: WalletBalance[],
): Promise<SetupScreen> => {
  const controller = new AbortController();
  const { is_refill_required, allow_start_agent } =
    await BalanceService.getBalancesAndFundingRequirements({
      serviceConfigId,
      signal: controller.signal,
    });

  if (!is_refill_required && allow_start_agent) {
    return SETUP_SCREEN.ConfirmFunding;
  }

  if (walletBalances.some((b) => b.balance > 0)) {
    return SETUP_SCREEN.BalanceCheck;
  }

  return SETUP_SCREEN.FundYourAgent;
};

type SwitchStakingButtonProps = {
  stakingProgramId: StakingProgramId;
  isCurrentStakingProgram?: boolean;
  buttonLabelOverride?: string;
  onSelectStart?: () => void;
  onSelectEnd?: () => void;
};

/**
 * Button to select default staking program during onboarding
 */
export const SelectStakingButton = ({
  stakingProgramId,
  isCurrentStakingProgram = false,
  buttonLabelOverride,
  onSelectStart,
  onSelectEnd,
}: SwitchStakingButtonProps) => {
  const { goto: gotoSetup } = useSetup();
  const { setDefaultStakingProgramId } = useStakingProgram();
  const {
    selectedService,
    selectedAgentType,
    selectedAgentConfig,
    isLoading: isServicesLoading,
    refetch: refetchServices,
    updateSelectedInstance,
  } = useServices();
  const { getMasterSafeBalancesOf, getMasterEoaBalancesOf } =
    useMasterBalances();

  const walletBalances = useMemo(() => {
    const chainId = selectedAgentConfig.evmHomeChainId;
    const safeBalances = getMasterSafeBalancesOf(chainId);
    return safeBalances.length > 0
      ? safeBalances
      : getMasterEoaBalancesOf(chainId);
  }, [
    selectedAgentConfig.evmHomeChainId,
    getMasterSafeBalancesOf,
    getMasterEoaBalancesOf,
  ]);
  const { buttonText, canMigrate } = useCanMigrate({
    stakingProgramId,
    isCurrentStakingProgram,
  });

  const {
    value: isLoading,
    setTrue: startLoading,
    setFalse: stopLoading,
  } = useBoolean(false);

  const handleSelect = async () => {
    onSelectStart?.();
    startLoading();

    try {
      let newServiceConfigId: string | undefined;

      // If service already exists, need to update the selected contract in it
      // for proper fund requirements calculation
      if (selectedService) {
        try {
          await updateServiceIfNeeded(
            selectedService,
            selectedAgentType,
            stakingProgramId,
          );
        } catch (error) {
          console.error(error);
          message.error(
            'An error occurred while updating the staking contract.',
          );
          stopLoading();
          return;
        }
      } else {
        // Otherwise need to create dummy service
        const serviceTemplate = SERVICE_TEMPLATES.find(
          (template) => template.agentType === selectedAgentType,
        );

        if (!serviceTemplate) {
          throw new Error('Service template unavailable');
        }

        try {
          const newService = await onDummyServiceCreation(
            stakingProgramId,
            serviceTemplate,
          );
          newServiceConfigId = newService.service_config_id;
        } catch (error) {
          console.error(error);
          message.error(
            'An error occurred while updating the staking contract.',
          );
          stopLoading();
          return;
        }
      }

      // fetch services again to update the state after service creation
      await refetchServices?.();

      // Select the newly created instance
      if (newServiceConfigId) {
        updateSelectedInstance(newServiceConfigId);
      }

      setDefaultStakingProgramId(stakingProgramId);

      const serviceConfigId =
        newServiceConfigId ?? selectedService?.service_config_id;

      if (!serviceConfigId) {
        gotoSetup(SETUP_SCREEN.FundYourAgent);
        return;
      }

      const route = await resolveFundingRoute(serviceConfigId, walletBalances);
      gotoSetup(route);
    } finally {
      onSelectEnd?.();
    }
  };

  return (
    <Button
      size="large"
      type="primary"
      onClick={handleSelect}
      block
      disabled={!canMigrate || isServicesLoading}
      loading={isLoading}
    >
      {buttonLabelOverride ?? buttonText}
    </Button>
  );
};
