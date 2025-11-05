import { Button as AntdButton, Flex } from 'antd';
import styled from 'styled-components';
import { useBoolean } from 'usehooks-ts';

import { SetupScreen } from '@/enums';
import { StakingProgramId } from '@/enums/StakingProgram';
import {
  useBalanceAndRefillRequirementsContext,
  useServices,
  useSetup,
} from '@/hooks';
import { useStakingProgram } from '@/hooks/useStakingProgram';
import { updateServiceStakingContract } from '@/utils';

import { useCanMigrate } from './hooks/useCanMigrate';

const Button = styled(AntdButton)<{ $overrideDisabledStyle?: boolean }>`
  &:disabled {
    cursor: pointer !important;

    > * {
      pointer-events: unset !important;
    }
  }
`;

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
      // If service already exists, need to update the selected contract in it
      // for proper fund requirements calculation
      await updateServiceStakingContract(selectedService, stakingProgramId);
      await refetch();
      stopLoading();
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
