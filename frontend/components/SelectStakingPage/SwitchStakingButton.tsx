import { InfoCircleOutlined } from '@ant-design/icons';
import { Button as AntdButton, Flex } from 'antd';
import { useEffect } from 'react';
import styled from 'styled-components';

import { PAGES, StakingProgramId } from '@/constants';
import { usePageState, useStakingProgram } from '@/hooks';

import { CooldownContentTooltip } from './CooldownTooltip';
import { MigrateButtonText, useCanMigrate } from './hooks/useCanMigrate';

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

/**
 * Button for switch to another staking program
 */
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
    buttonText === MigrateButtonText.AgentInCooldownPeriod;

  const handleMigrate = () => {
    setStakingProgramIdToMigrateTo(stakingProgramId);
    goto(PAGES.ConfirmSwitch);
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
