import { Typography } from 'antd';
import { useMemo } from 'react';

import { InfoTooltip } from '@/components/InfoTooltip';
import { COLOR } from '@/constants/colors';
import { useAgentActivity } from '@/hooks/useAgentActivity';
import { useRewardContext } from '@/hooks/useRewardContext';

import { useServiceDeployment } from '../AgentRunButton/hooks/useServiceDeployment';
import { Container, CurrentActionText, Text, TopCorner } from './styles';
import { AgentStatus } from './types';

const { Paragraph } = Typography;

export const AgentActivity = () => {
  const { isDeployable } = useServiceDeployment();
  const { deploymentDetails, isServiceRunning, isServiceDeploying } =
    useAgentActivity();
  const { isEligibleForRewards } = useRewardContext();

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
      if (isEligibleForRewards) {
        return {
          status: 'idle',
          content: (
            <>
              Agent has earned staking rewards and is in standby mode for the
              next epoch{' '}
              <InfoTooltip
                iconStyles={{ color: COLOR.TEXT_COLOR.SUCCESS.DEFAULT }}
              >
                <Paragraph className="text-sm m-0">
                  The agent is inactive during standby. If you keep it running,
                  it will resume activity automatically at the start of the next
                  epoch.
                </Paragraph>
              </InfoTooltip>
            </>
          ),
        };
      }
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
  }, [
    deploymentDetails,
    isEligibleForRewards,
    isServiceDeploying,
    isServiceRunning,
  ]);

  if (!isDeployable) return null;

  return (
    <Container $status={activityInfo.status}>
      <TopCorner $position="left" $status={activityInfo.status} />
      <TopCorner $position="right" $status={activityInfo.status} />
      <Text $status={activityInfo.status}>{activityInfo.content}</Text>
    </Container>
  );
};
