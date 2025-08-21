import { useMemo } from 'react';
import styled from 'styled-components';

import { COLOR } from '@/constants/colors';
import { useAgentActivity } from '@/hooks/useAgentActivity';

const LINE_HEIGHT = 46;
const CARD_MARGIN = 24;

/**
 * "not-running" - the agent is not running
 * "loading" - the agent is deploying and waiting confirmation from BE that it's running
 * "running" - the agent is running
 * "activity-not-ready" - the agent is running, but healthcheck is not responding, might happen for up to 1min after running
 * "idle" - the agent is running and has earned rewards
 */
type AgentStatus =
  | 'not-running'
  | 'loading'
  | 'running'
  | 'activity-not-ready'
  // TODO: implement idle status
  | 'idle';

const TopCorner = styled.div<{
  $position: 'left' | 'right';
  $status: AgentStatus;
}>`
  position: absolute;
  bottom: ${LINE_HEIGHT}px;
  height: ${CARD_MARGIN}px;
  width: ${CARD_MARGIN}px;
  ${({ $status }) =>
    $status === 'loading' || $status === 'activity-not-ready'
      ? `background: ${COLOR.PURPLE_LIGHT_2};`
      : $status === 'running'
        ? `background: ${COLOR.PURPLE_LIGHT_3};`
        : `background: ${COLOR.GRAY_4};`}

  ${({ $position }) =>
    $position === 'left'
      ? `left: -${CARD_MARGIN - 1}px;`
      : `right: -${CARD_MARGIN - 1}px;`}

  &:after {
    content: '';
    position: absolute;
    bottom: 0;
    height: ${CARD_MARGIN}px;
    width: ${CARD_MARGIN}px;
    background: ${COLOR.WHITE};
    ${({ $position }) =>
      $position === 'left'
        ? `left: 0; border-radius: 0 0 0 20px;`
        : `right: 0; border-radius: 0 0 20px 0;`}
  }
`;

const Container = styled.div<{
  $status: AgentStatus;
}>`
  display: flex;
  margin: ${CARD_MARGIN}px -${CARD_MARGIN - 1}px -${CARD_MARGIN - 1}px;
  padding: 12px;
  height: ${LINE_HEIGHT}px;
  overflow: hidden;
  border-bottom-right-radius: 10px;
  border-bottom-left-radius: 10px;
  ${({ $status }) =>
    $status === 'loading' || $status === 'activity-not-ready'
      ? `background: ${COLOR.PURPLE_LIGHT_2};`
      : $status === 'running'
        ? `background: linear-gradient(180deg, ${COLOR.PURPLE_LIGHT_3} 80%, ${COLOR.PURPLE_LIGHT_4} 100%);`
        : `background: ${COLOR.GRAY_4};`}
`;

const Text = styled.span<{ $status: AgentStatus }>`
  position: relative;
  z-index: 1;

  ${({ $status }) =>
    $status === 'loading' || $status === 'activity-not-ready'
      ? `
          color: ${COLOR.TEXT_INFO};
          margin: auto;
        `
      : $status === 'running'
        ? `
          color: ${COLOR.PURPLE};
        `
        : `
          color: ${COLOR.TEXT_LIGHT};
          margin: auto;
        `}
`;

const CurrentActionText = styled.span`
  color: ${COLOR.PURPLE_2};
`;

export const AgentActivity = () => {
  const { deploymentDetails, isServiceRunning, isServiceDeploying } =
    useAgentActivity();

  const activityInfo = useMemo<{
    status: AgentStatus;
    content: string | React.ReactNode;
  }>(() => {
    if (isServiceDeploying) {
      return {
        status: 'loading',
        content: 'Agent is loading',
      };
    }

    if (isServiceRunning) {
      if (
        deploymentDetails &&
        deploymentDetails.healthcheck &&
        deploymentDetails.healthcheck.rounds?.length > 0
      ) {
        const currentRound = deploymentDetails.healthcheck.rounds[0];
        const roundInfo =
          deploymentDetails.healthcheck.rounds_info?.[currentRound]?.name ||
          currentRound;

        return {
          status: 'running',
          content: (
            <>
              <CurrentActionText>Current action:</CurrentActionText> {roundInfo}
            </>
          ),
        };
      }
      return {
        status: 'activity-not-ready',
        content: 'Agent is pending first activity',
      };
    }

    return {
      status: 'not-running',
      content: 'Agent is not running',
    };
  }, [deploymentDetails, isServiceDeploying, isServiceRunning]);

  return (
    <Container $status={activityInfo.status}>
      <TopCorner $position="left" $status={activityInfo.status} />
      <TopCorner $position="right" $status={activityInfo.status} />
      <Text $status={activityInfo.status}>{activityInfo.content}</Text>
    </Container>
  );
};
