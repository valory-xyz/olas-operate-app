import { InfoCircleOutlined } from '@ant-design/icons';
import { Button as AntdButton, Flex } from 'antd';
import { useEffect } from 'react';
import styled from 'styled-components';

import { Pages } from '@/enums/Pages';
import { StakingProgramId } from '@/enums/StakingProgram';
import { usePageState } from '@/hooks/usePageState';
import { useStakingProgram } from '@/hooks/useStakingProgram';

import { CooldownContentTooltip } from './CooldownTooltip';
import { CantMigrateReason, useCanMigrate } from './hooks/useCanMigrate';

const Button = styled(AntdButton)<{ $overrideDisabledStyle?: boolean }>`
  &:disabled {
    cursor: pointer !important;

    > * {
      pointer-events: unset !important;
    }
  }
`;

type SwitchStakingButtonProps = {
  isCurrentStakingProgram: boolean;
  stakingProgramId: StakingProgramId;
};

export const SwitchStakingButton = ({
  isCurrentStakingProgram,
  stakingProgramId,
}: SwitchStakingButtonProps) => {
  const { goto } = usePageState();
  const { buttonText, canMigrate } = useCanMigrate({
    stakingProgramId,
    isCurrentStakingProgram,
  });

  const { setStakingProgramIdToMigrateTo } = useStakingProgram();
  const agentInCooldownPeriod =
    buttonText === CantMigrateReason.AgentInCooldownPeriod;

  const handleMigrate = () => {
    setStakingProgramIdToMigrateTo(stakingProgramId);
    goto(Pages.ConfirmSwitch);
  };

  // Reset the staking program id to null when component mounts.
  useEffect(() => {
    setStakingProgramIdToMigrateTo(null);
  }, [setStakingProgramIdToMigrateTo]);

  return (
    <Flex className="px-24 py-24">
      <Button
        size="large"
        type="primary"
        onClick={handleMigrate}
        block
        disabled={!canMigrate}
        $overrideDisabledStyle={agentInCooldownPeriod}
      >
        {agentInCooldownPeriod ? (
          <CooldownContentTooltip>
            {buttonText} <InfoCircleOutlined className="ml-2" />
          </CooldownContentTooltip>
        ) : (
          buttonText
        )}
      </Button>
    </Flex>
  );
};
