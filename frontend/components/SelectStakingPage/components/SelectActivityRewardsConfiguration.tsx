import { InfoCircleOutlined } from '@ant-design/icons';
import { Button as AntdButton, Flex, Typography } from 'antd';
import { ReactNode, useEffect } from 'react';
import styled from 'styled-components';

import { StakingContractCard } from '@/components/StakingContractCard';
import { MAIN_CONTENT_MAX_WIDTH, PAGES, StakingProgramId } from '@/constants';
import { usePageState, useStakingContracts, useStakingProgram } from '@/hooks';
import { Nullable } from '@/types';

import { MigrateButtonText, useCanMigrate } from '../hooks/useCanMigrate';
import { SelectMode } from '../types';
import { CooldownContentTooltip } from './CooldownTooltip';
import { SelectStakingButton } from './SelectStakingButton';

const { Title, Text } = Typography;

const StakingContractsWrapper = styled.div`
  display: grid;
  grid-template-columns: auto auto;
  justify-content: center;
  gap: 24px;
  margin-top: 32px;
`;

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
const SwitchStakingButton = ({
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

type SelectActivityRewardsConfigurationProps = {
  mode: SelectMode;
  backButton?: ReactNode;
  currentStakingProgramId: Nullable<StakingProgramId>;
};

export const SelectActivityRewardsConfiguration = ({
  mode,
  backButton,
  currentStakingProgramId,
}: SelectActivityRewardsConfigurationProps) => {
  const { orderedStakingProgramIds } = useStakingContracts();

  return (
    <Flex vertical justify="center" className="w-full">
      <Flex
        vertical
        className="mx-auto"
        style={{ width: MAIN_CONTENT_MAX_WIDTH }}
      >
        {backButton}
        <Title level={3} className="mt-12">
          Select Activity Rewards Configuration
        </Title>
        <Text className="text-neutral-secondary">
          Configuration defines how much activity rewards you can earn by using
          your agent.
        </Text>
      </Flex>

      <StakingContractsWrapper>
        {orderedStakingProgramIds.map((stakingProgramId) => {
          const isCurrentStakingProgram =
            stakingProgramId === currentStakingProgramId;
          return (
            <StakingContractCard
              key={stakingProgramId}
              stakingProgramId={stakingProgramId}
              renderAction={() => (
                <>
                  {mode === 'onboard' && (
                    <Flex className="px-24 pb-24 mt-40" gap={16}>
                      <SelectStakingButton
                        isCurrentStakingProgram={isCurrentStakingProgram}
                        stakingProgramId={stakingProgramId}
                      />
                    </Flex>
                  )}
                  {mode === 'migrate' && (
                    <SwitchStakingButton
                      isCurrentStakingProgram={isCurrentStakingProgram}
                      stakingProgramId={stakingProgramId}
                    />
                  )}
                </>
              )}
            />
          );
        })}
      </StakingContractsWrapper>
    </Flex>
  );
};
