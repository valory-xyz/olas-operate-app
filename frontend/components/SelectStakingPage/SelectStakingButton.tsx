import { Button, Flex, message } from 'antd';
import { useBoolean } from 'usehooks-ts';

import { SetupScreen, StakingProgramId } from '@/enums';
import {
  useBalanceAndRefillRequirementsContext,
  useServices,
  useSetup,
  useStakingProgram,
} from '@/hooks';
import { updateServiceStakingContract } from '@/utils';

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
  const { goto } = useSetup();
  const { buttonText, canMigrate } = useCanMigrate({
    stakingProgramId,
    isCurrentStakingProgram: false,
  });

  const { selectedService } = useServices();
  const { refetch } = useBalanceAndRefillRequirementsContext();
  const { setDefaultStakingProgramId } = useStakingProgram();

  const handleSelect = async () => {
    if (selectedService) {
      startLoading();
      try {
        // If service already exists, need to update the selected contract in it
        // for proper fund requirements calculation
        await updateServiceStakingContract(selectedService, stakingProgramId);
        await refetch();
      } catch (error) {
        console.error(error);
        message.error('An error occurred while updating the staking contract.');
        return;
      } finally {
        stopLoading();
      }
    }

    setDefaultStakingProgramId(stakingProgramId);
    goto(SetupScreen.FundYourAgent);
  };

  return (
    <Flex className="px-24 py-24">
      <Button
        size="large"
        type="primary"
        onClick={handleSelect}
        block
        disabled={!canMigrate}
        loading={isLoading}
      >
        {buttonText}
      </Button>
    </Flex>
  );
};
