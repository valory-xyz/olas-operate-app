import { InfoCircleOutlined } from '@ant-design/icons';
import { Button as AntdButton, Flex, Typography } from 'antd';
import { ReactNode, useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';

import { StakingContractCard } from '@/components/StakingContractCard';
import { MainContentContainer } from '@/components/ui';
import { PAGES, StakingProgramId } from '@/constants';
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
  const { setStakingProgramIdToMigrateTo } = useStakingProgram();
  const { buttonText, canMigrate } = useCanMigrate({
    stakingProgramId,
    isCurrentStakingProgram,
  });

  const agentInCooldownPeriod =
    buttonText === MigrateButtonText.AgentInCooldownPeriod;

  const handleMigrate = useCallback(() => {
    setStakingProgramIdToMigrateTo(stakingProgramId);
    goto(PAGES.ConfirmSwitch);
  }, [setStakingProgramIdToMigrateTo, stakingProgramId, goto]);

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
  onSelectStart?: () => void;
  onSelectEnd?: () => void;
};

export const SelectActivityRewardsConfiguration = ({
  mode,
  backButton,
  currentStakingProgramId,
  onSelectStart,
  onSelectEnd,
}: SelectActivityRewardsConfigurationProps) => {
  const { orderedStakingProgramIds } = useStakingContracts();
  const [stableOrder, setStableOrder] = useState<StakingProgramId[]>([]);

  // Keep render order stable across renders. Reset only when the SET of IDs
  // changes (agent switch / strict subset / superset). Initial population is
  // covered by `hasNewIds` (empty `stableOrder` makes every incoming id new).
  // Do NOT add a `!stableOrder.length` guard — when both arrays are empty
  // (initial loading state) it fires `setStableOrder([])` every render and
  // produces "Maximum update depth exceeded" because each new `[]` ref
  // changes the dep and re-triggers the effect.
  useEffect(() => {
    const nextSet = new Set(orderedStakingProgramIds);
    const currentSet = new Set(stableOrder);
    const hasNewIds = orderedStakingProgramIds.some(
      (id) => !currentSet.has(id),
    );
    const hasRemovedIds = stableOrder.some((id) => !nextSet.has(id));

    if (hasNewIds || hasRemovedIds) {
      setStableOrder(orderedStakingProgramIds);
    }
  }, [orderedStakingProgramIds, stableOrder]);

  return (
    <Flex vertical justify="center" className="w-full">
      <MainContentContainer vertical>
        {backButton}
        <Title level={3} className="mt-12">
          Select Activity Rewards Configuration
        </Title>
        <Text className="text-neutral-secondary">
          Configuration defines how much activity rewards you can earn by using
          your agent.
        </Text>
      </MainContentContainer>

      <StakingContractsWrapper>
        {stableOrder.map((stakingProgramId) => {
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
                        onSelectStart={onSelectStart}
                        onSelectEnd={onSelectEnd}
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
