import { Button, message } from 'antd';
import { useBoolean } from 'usehooks-ts';

import { SETUP_SCREEN, SetupScreen, StakingProgramId } from '@/constants';
import { SERVICE_TEMPLATES } from '@/constants/serviceTemplates';
import {
  useIsInitiallyFunded,
  useServices,
  useSetup,
  useStakingProgram,
} from '@/hooks';
import { BalanceService } from '@/service/Balance';
import { AddressBalanceRecord, BalancesAndFundingRequirements } from '@/types';
import { Address } from '@/types/Address';
import { onDummyServiceCreation, updateServiceIfNeeded } from '@/utils';

import { useCanMigrate } from '../hooks/useCanMigrate';

/**
 * Returns true if any required token has a non-zero balance in the same
 * wallet. Derived from the freshly fetched funding-requirements response so
 * the routing decision is not subject to stale React state for the previous
 * service config.
 */
const hasWalletContribution = (
  balances: BalancesAndFundingRequirements['balances'],
  totalRequirements: BalancesAndFundingRequirements['total_requirements'],
): boolean =>
  Object.entries(totalRequirements).some(([chain, addrMap]) => {
    const chainBalances = balances?.[chain as keyof typeof balances] as
      | AddressBalanceRecord
      | undefined;
    return Object.entries(addrMap as AddressBalanceRecord).some(
      ([addr, tokenMap]) =>
        Object.entries(tokenMap).some(([tokenAddr, required]) => {
          if (BigInt(required) === 0n) return false;
          const bal =
            chainBalances?.[addr as Address]?.[tokenAddr as Address] ?? '0';
          return BigInt(bal) > 0n;
        }),
    );
  });

/** Determines which funding screen to route to after staking selection */
const resolveFundingRoute = async (
  serviceConfigId: string,
): Promise<SetupScreen> => {
  const controller = new AbortController();
  const {
    balances,
    total_requirements,
    is_refill_required,
    allow_start_agent,
  } = await BalanceService.getBalancesAndFundingRequirements({
    serviceConfigId,
    signal: controller.signal,
  });

  if (!is_refill_required && allow_start_agent) {
    return SETUP_SCREEN.ConfirmFunding;
  }

  if (hasWalletContribution(balances, total_requirements)) {
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
    isLoading: isServicesLoading,
    refetch: refetchServices,
    updateSelectedServiceConfigId,
  } = useServices();
  const { markServiceAsNotInitiallyFunded } = useIsInitiallyFunded();

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
          markServiceAsNotInitiallyFunded(newServiceConfigId);
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
        updateSelectedServiceConfigId(newServiceConfigId);
      }

      setDefaultStakingProgramId(stakingProgramId);

      const serviceConfigId =
        newServiceConfigId ?? selectedService?.service_config_id;

      if (!serviceConfigId) {
        gotoSetup(SETUP_SCREEN.FundYourAgent);
        return;
      }

      const route = await resolveFundingRoute(serviceConfigId);
      gotoSetup(route);
    } finally {
      stopLoading();
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
