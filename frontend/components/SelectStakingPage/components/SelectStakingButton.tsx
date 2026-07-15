import { Button, message } from 'antd';
import { useBoolean } from 'usehooks-ts';

import { SETUP_SCREEN, StakingProgramId } from '@/constants';
import { SERVICE_TEMPLATES } from '@/constants/serviceTemplates';
import {
  useIsInitiallyFunded,
  useServices,
  useSetup,
  useStakingProgram,
} from '@/hooks';
import { onDummyServiceCreation, updateServiceIfNeeded } from '@/utils';
import { resolveFundingRoute } from '@/utils/fundingRoute';

import { useCanMigrate } from '../hooks/useCanMigrate';

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
