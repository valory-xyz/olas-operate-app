import { useMemo } from 'react';
import { useAgentActivity } from '@/hooks/useAgentActivity';
import { AgentStatus } from './types';
import { Container, CurrentActionText, TopCorner, Text } from './styles';

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
      if (deploymentDetails?.healthcheck?.rounds) {
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
