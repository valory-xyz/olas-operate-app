import { Flex, Typography } from 'antd';
import { isNil } from 'lodash';
import { useMemo } from 'react';
import {
  TbRosetteDiscountCheck,
  TbRosetteDiscountCheckFilled,
} from 'react-icons/tb';
import styled, { css, keyframes } from 'styled-components';
import { useBoolean } from 'usehooks-ts';

import { Tooltip } from '@/components/ui';
import { COLOR } from '@/constants';
import { isActiveDeploymentStatus } from '@/constants/deployment';
import {
  useActivityGoal,
  useAgentActivity,
  useEpochWorkStatus,
  useRewardContext,
  useServices,
} from '@/hooks';
import { deriveIsActivityGoalMet } from '@/utils/activityGoal';

import { AgentActivityModal } from '../AgentInfo/AgentActivity/AgentActivityModal';
import { CHAT_COPY } from './constants';

const { Text } = Typography;

type Tone = 'active' | 'still';

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
`;

const ActivityDots = styled.span<{ $tone: Tone }>`
  flex: none;
  width: 14px;
  height: 14px;
  background-image: radial-gradient(
    circle,
    ${({ $tone }) => ($tone === 'active' ? COLOR.PURPLE : COLOR.NEUTRAL_4)} 1px,
    transparent 1.5px
  );
  background-size: 4px 4px;
  ${({ $tone }) =>
    $tone === 'active' &&
    css`
      animation: ${pulse} 1.4s ease-in-out infinite;
    `}
`;

const Row = styled(Flex)<{ $isClickable: boolean }>`
  padding: 8px 24px;
  cursor: ${({ $isClickable }) => ($isClickable ? 'pointer' : 'default')};
`;

const RowText = styled(Text)<{ $tone: Tone }>`
  color: ${({ $tone }) =>
    $tone === 'active' ? COLOR.PURPLE : COLOR.TEXT_NEUTRAL_TERTIARY};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Badge = ({ isDone }: { isDone: boolean }) =>
  isDone ? (
    <TbRosetteDiscountCheckFilled
      fontSize={16}
      color={COLOR.PURPLE}
      data-testid="badge-done"
    />
  ) : (
    <TbRosetteDiscountCheck
      fontSize={16}
      color={COLOR.NEUTRAL_4}
      data-testid="badge-pending"
    />
  );

/** Activity rewards and the daily activity target, grey until reached. */
const RewardBadges = () => {
  const { selectedService } = useServices();
  const { isEpochTargetMet, stakingRewardsDetails } = useRewardContext();
  const { activityGoal } = useActivityGoal(selectedService?.service_config_id);
  const tsCheckpoint = stakingRewardsDetails?.tsCheckpoint;

  const isRewardsEarned = isEpochTargetMet === true;
  const isTargetReached =
    !isNil(tsCheckpoint) &&
    deriveIsActivityGoalMet(activityGoal, tsCheckpoint) === true;

  return (
    <Tooltip
      placement="topRight"
      title={
        <Flex vertical gap={4} className="text-sm">
          <span>
            {CHAT_COPY.activityRewards}:{' '}
            {isRewardsEarned ? CHAT_COPY.earned : CHAT_COPY.notEarned}
          </span>
          <span>
            {CHAT_COPY.dailyActivityTarget}:{' '}
            {isTargetReached ? CHAT_COPY.reached : CHAT_COPY.notReached}
          </span>
          <span>{CHAT_COPY.targetHint}</span>
        </Flex>
      }
    >
      <Flex gap={4} align="center" className="flex-none">
        <Badge isDone={isRewardsEarned} />
        <Badge isDone={isTargetReached} />
      </Flex>
    </Tooltip>
  );
};

type LoaderRowProps = {
  isPending: boolean;
  isStillThinking: boolean;
  isMessagesOnly: boolean;
};

/**
 * One line above the input: the agent's current step, a pending reply, or why
 * it isn't working. Absent while the agent is stopped or has never run.
 */
export const LoaderRow = ({
  isPending,
  isStillThinking,
  isMessagesOnly,
}: LoaderRowProps) => {
  const { selectedService } = useServices();
  const { deploymentDetails, isAgentActive, isServiceDeploying } =
    useAgentActivity();
  const { workStatus } = useEpochWorkStatus();
  const {
    value: isModalOpen,
    setTrue: openModal,
    setFalse: closeModal,
  } = useBoolean(false);

  const rounds = useMemo(
    () => [...(deploymentDetails?.healthcheck?.rounds ?? [])].reverse(),
    [deploymentDetails?.healthcheck?.rounds],
  );
  const roundsInfo = deploymentDetails?.healthcheck?.rounds_info;
  const canOpenModal = isAgentActive && rounds.length > 0;

  const state = useMemo((): { text: string; tone: Tone } | null => {
    if (isPending) {
      return {
        text: isStillThinking ? CHAT_COPY.stillThinking : CHAT_COPY.thinking,
        tone: 'active',
      };
    }
    if (isMessagesOnly) return null;
    if (isServiceDeploying) return { text: CHAT_COPY.loading, tone: 'active' };
    if (!isAgentActive) return { text: CHAT_COPY.notRunning, tone: 'still' };
    if (workStatus === 'standby') {
      return { text: CHAT_COPY.standby, tone: 'still' };
    }
    if (rounds.length > 0) {
      const currentRound = rounds[0];
      return {
        text: roundsInfo?.[currentRound]?.name || currentRound,
        tone: 'active',
      };
    }
    return { text: CHAT_COPY.running, tone: 'active' };
  }, [
    isAgentActive,
    isMessagesOnly,
    isPending,
    isServiceDeploying,
    isStillThinking,
    rounds,
    roundsInfo,
    workStatus,
  ]);

  if (!isActiveDeploymentStatus(selectedService?.deploymentStatus)) return null;
  if (!state) return null;

  const isClickable = canOpenModal && !isPending;

  return (
    <>
      <Row
        align="center"
        gap={12}
        $isClickable={isClickable}
        onClick={isClickable ? openModal : undefined}
        data-testid="loader-row"
      >
        <ActivityDots $tone={state.tone} />
        <RowText $tone={state.tone} className="flex-auto">
          {state.text}
        </RowText>
        {!isMessagesOnly && <RewardBadges />}
      </Row>
      <AgentActivityModal
        open={isModalOpen && canOpenModal}
        onClose={closeModal}
        rounds={rounds}
        roundsInfo={roundsInfo}
      />
    </>
  );
};
