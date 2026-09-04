import { InfoCircleOutlined } from '@ant-design/icons';
import { Button as AntdButton, Flex, Typography } from 'antd';
import { ReactNode, useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';

import { NoStakingRewardsAlert } from '@/components/NoStakingRewardsAlert';
import { StakingContractCard } from '@/components/StakingContractCard';
import { Alert, MainContentContainer } from '@/components/ui';
import { PAGES, StakingProgramId } from '@/constants';
import {
  usePageState,
  useStakingContractDetails,
  useStakingContracts,
  useStakingProgram,
} from '@/hooks';
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

/**
 * Non-blocking warning surfaced on a contract card whose reward pool is empty.
 * The contract stays selectable (`useCanMigrate` is unchanged) — this only
 * tells the user the agent won't earn rewards there until it's refilled.
 */
export const StakingRewardsWarning = ({
  stakingProgramId,
}: {
  stakingProgramId: StakingProgramId;
}) => {
  const { stakingContractInfo, isRewardsAvailable } =
    useStakingContractDetails(stakingProgramId);

  // Only warn once details have loaded — `isRewardsAvailable` is false while
  // undefined, which would otherwise flash the warning during loading.
  if (!stakingContractInfo || isRewardsAvailable) return null;

  return (
    <Flex className="px-24 mt-16">
      <NoStakingRewardsAlert className="w-full" />
    </Flex>
  );
};

/** True when the two lists contain a different SET of ids (order ignored). */
const haveDifferentIds = (
  current: StakingProgramId[],
  next: StakingProgramId[],
) => {
  const currentSet = new Set(current);
  const nextSet = new Set(next);
  return (
    next.some((id) => !currentSet.has(id)) ||
    current.some((id) => !nextSet.has(id))
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
  const {
    orderedStakingProgramIds,
    isStakingContractsLoaded,
    isStakingContractsError,
    retryStakingContracts,
  } = useStakingContracts();
  // Keep render order stable across renders: reset only when the SET of ids
  // changes (agent switch / strict subset / superset), not when the same ids
  // are re-sorted. Derived during render (React's "adjust state on prop
  // change" pattern) rather than in an effect, so the cards and the alert
  // below always reflect the same list within one committed frame — an
  // effect would lag one paint behind and briefly show the empty-state alert
  // above a populated list (or vice versa). Both-empty is a no-op, so the
  // initial loading state doesn't loop.
  const [stableOrder, setStableOrder] = useState<StakingProgramId[]>(
    orderedStakingProgramIds,
  );
  if (haveDifferentIds(stableOrder, orderedStakingProgramIds)) {
    setStableOrder(orderedStakingProgramIds);
  }

  const hasNoCompatibleContracts =
    isStakingContractsLoaded &&
    !isStakingContractsError &&
    orderedStakingProgramIds.length === 0;

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

      {isStakingContractsError && (
        <MainContentContainer vertical className="mt-32">
          <Alert
            type="error"
            showIcon
            message="Could not verify which staking contracts your agent can use."
            action={
              <Button size="small" onClick={retryStakingContracts}>
                Retry
              </Button>
            }
          />
        </MainContentContainer>
      )}

      {hasNoCompatibleContracts && (
        <MainContentContainer vertical className="mt-32">
          <Alert
            type="info"
            showIcon
            message="No compatible staking contracts are available for this agent yet."
          />
        </MainContentContainer>
      )}

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
                  <StakingRewardsWarning stakingProgramId={stakingProgramId} />
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
