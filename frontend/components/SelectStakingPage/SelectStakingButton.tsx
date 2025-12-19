import { Button, Flex, message } from 'antd';
import { useBoolean } from 'usehooks-ts';

import { PAGES, SETUP_SCREEN, StakingProgramId } from '@/constants';
import { SERVICE_TEMPLATES } from '@/constants/serviceTemplates';
import {
  useBalanceAndRefillRequirementsContext,
  useIsInitiallyFunded,
  usePageState,
  useServices,
  useSetup,
  useStakingProgram,
} from '@/hooks';
import { onDummyServiceCreation, updateServiceIfNeeded } from '@/utils';

import { useCanMigrate } from './hooks/useCanMigrate';

type SwitchStakingButtonProps = {
  stakingProgramId: StakingProgramId;
};

/**
 * Button for select default staking program during onboarding
 */
export const SelectStakingButton = ({
  stakingProgramId,
}: SwitchStakingButtonProps) => {
  const {
    value: isLoading,
    setTrue: startLoading,
    setFalse: stopLoading,
  } = useBoolean(false);

  const { goto: gotoSetup } = useSetup();
  const { goto: gotoPage } = usePageState();

  const { buttonText, canMigrate } = useCanMigrate({
    stakingProgramId,
    isCurrentStakingProgram: false,
  });

  const {
    selectedService,
    selectedAgentType,
    isLoading: isServicesLoading,
    refetch: refetchServices,
  } = useServices();
  const { refetchForSelectedAgent: refetchRequirements } =
    useBalanceAndRefillRequirementsContext();
  const { setDefaultStakingProgramId } = useStakingProgram();

  const { setIsInitiallyFunded } = useIsInitiallyFunded();

  const handleSelect = async () => {
    startLoading();

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
        message.error('An error occurred while updating the staking contract.');
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
        await onDummyServiceCreation(stakingProgramId, serviceTemplate);
      } catch (error) {
        console.error(error);
        message.error('An error occurred while updating the staking contract.');
        stopLoading();
      }

      // fetch services again to update the state after service creation
      // and to have correct state in the selectedService if we get back to this page
      await refetchServices?.();
    }

    // refetch refill requirements to check if the agent requires funding
    const result = await refetchRequirements();
    const isRefillRequired = result.data?.is_refill_required;
    const allowStartAgent = result.data?.allow_start_agent;

    // Update state in the end so the order change is not noticeable
    setDefaultStakingProgramId(stakingProgramId);

    // If has sufficient funds to run selected agent, navigate to main
    if (isRefillRequired === false && allowStartAgent === true) {
      setIsInitiallyFunded();
      gotoPage(PAGES.Main);
    } else {
      // Otherwise navigate to funding page
      gotoSetup(SETUP_SCREEN.FundYourAgent);
    }
  };

  return (
    <Flex className="px-24 py-24">
      <Button
        size="large"
        type="primary"
        onClick={handleSelect}
        block
        disabled={!canMigrate || isServicesLoading}
        loading={isLoading}
      >
        {buttonText}
      </Button>
    </Flex>
  );
};
