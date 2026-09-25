import { Flex, Typography } from 'antd';
import { ReactNode, useMemo } from 'react';
import { LuChevronsUpDown } from 'react-icons/lu';
import styled from 'styled-components';
import { useBoolean } from 'usehooks-ts';

import { InfoTooltip } from '@/components/ui';
import { COLOR } from '@/constants';
import { useAgentActivity, useConnectSession, useRewardContext } from '@/hooks';

import { AgentActivityModal } from './AgentActivityModal';
import { Container, Text } from './styles';
import { AgentStatus } from './types';

const { Paragraph } = Typography;

const RoundInfoContainer = styled.div`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const CurrentActionText = styled.span`
  color: ${COLOR.PURPLE_2};
  white-space: nowrap;
  width: fit-content;
`;

const IdleContent = () => (
  <Flex align="center" justify="center" gap={4}>
    Agent has earned staking rewards and is in standby mode for the next epoch{' '}
    <InfoTooltip iconColor={COLOR.TEXT_COLOR.SUCCESS.DEFAULT}>
      <Paragraph className="text-sm m-0">
        The agent is inactive during standby. If you keep it running, it will
        resume activity automatically at the start of the next epoch.
      </Paragraph>
    </InfoTooltip>
  </Flex>
);

export const AgentActivity = () => {
  const {
    deploymentDetails,
    isAgentActive,
    isAgentRedeploying,
    isAgentStalled,
    isServiceDeploying,
  } = useAgentActivity();
  const { isEpochTargetMet } = useRewardContext();
  // Connect only: while the agent runs, the activity strip points at the
  // agent profile for new Claude Code sessions instead of rounds.
  const { showRunningInfo: isConnectRunning, isFirstRun } = useConnectSession();
  const {
    value: isModalOpen,
    setTrue: showModal,
    setFalse: handleClose,
  } = useBoolean(false);

  const rounds = useMemo(() => {
    return (deploymentDetails?.healthcheck?.rounds || []).reverse();
  }, [deploymentDetails?.healthcheck?.rounds]);

  const roundsInfo = useMemo(() => {
    return deploymentDetails?.healthcheck?.rounds_info;
  }, [deploymentDetails?.healthcheck?.rounds_info]);

  // `isAgentActive`, not `isServiceRunning`: a crash-looping agent stays
  // DEPLOYED while its round list is frozen at the round it died in.
  const canOpenModal = isAgentActive && !!rounds.length;

  const activityInfo = useMemo<{
    status: AgentStatus;
    content: string | ReactNode;
  }>(() => {
    if (isServiceDeploying) {
      return { status: 'loading', content: 'Agent is loading' };
    }

    if (isAgentActive) {
      if (isConnectRunning) {
        return {
          status: 'activity-not-ready',
          content: isFirstRun
            ? 'Your agent is running. You can visit the agent Profile to start a new session.'
            : 'Your agent is running. You can open the agent Profile to start a new session.',
        };
      }

      if (isEpochTargetMet) {
        return { status: 'idle', content: <IdleContent /> };
      }

      // Above the `rounds` branch, because that branch is what absorbs a stall
      // today: the round list is still there, frozen at the round the agent
      // stopped advancing past, so the strip reports "Current action: ..." for
      // as long as the stall lasts. Below the Connect and standby branches,
      // which are states the agent is deliberately in and must keep precedence.
      if (isAgentStalled) {
        return { status: 'stalled', content: "Agent isn't progressing" };
      }

      if (rounds.length > 0) {
        const currentRound = rounds[0];
        const roundInfo = roundsInfo?.[currentRound]?.name || currentRound;
        return {
          status: 'running',
          content: (
            <Flex justify="space-between" align="top" gap={6}>
              <CurrentActionText>Current action:</CurrentActionText>
              <RoundInfoContainer>{roundInfo}</RoundInfoContainer>
              <LuChevronsUpDown fontSize={20} className="ml-auto flex-none" />
            </Flex>
          ),
        };
      }

      // No rounds yet. That is the first-poll case on a fresh start, and it is
      // also what a middleware-forced restart looks like from here — same
      // DEPLOYED status, same empty round list — so this branch used to claim
      // "Agent is running" at the one moment it certainly was not. The restart
      // counter is the only field that separates the two.
      if (isAgentRedeploying) {
        return { status: 'redeploying', content: 'Agent is restarting' };
      }

      return {
        status: 'activity-not-ready',
        content: 'Agent is running',
      };
    }

    return { status: 'not-running', content: 'Agent is not running' };
  }, [
    isEpochTargetMet,
    isServiceDeploying,
    isAgentActive,
    isAgentRedeploying,
    isAgentStalled,
    isConnectRunning,
    isFirstRun,
    rounds,
    roundsInfo,
  ]);

  return (
    <>
      <Container
        $status={activityInfo.status}
        onClick={() => {
          if (!canOpenModal) return;
          showModal();
        }}
      >
        <Text $status={activityInfo.status} className="w-full text-center">
          {activityInfo.content}
        </Text>
      </Container>
      <AgentActivityModal
        open={isModalOpen && canOpenModal}
        onClose={handleClose}
        rounds={rounds}
        roundsInfo={roundsInfo}
      />
    </>
  );
};
