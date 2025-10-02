import { Flex, Typography } from 'antd';
import { useMemo, useState } from 'react';

import { ChevronUpDown } from '@/components/custom-icons/ChevronUpDown';
import { InfoTooltip } from '@/components/InfoTooltip';
import { COLOR } from '@/constants/colors';
import { useServiceDeployment } from '@/hooks';
import { useAgentActivity } from '@/hooks/useAgentActivity';
import { useRewardContext } from '@/hooks/useRewardContext';

import { AgentActivityModal } from './AgentActivityModal';
import { Container, CurrentActionText, Text, TopCorner } from './styles';
import { AgentStatus } from './types';

const { Paragraph } = Typography;

const IdleContent = () => (
  <>
    Agent has earned staking rewards and is in standby mode for the next epoch{' '}
    <InfoTooltip iconStyles={{ color: COLOR.TEXT_COLOR.SUCCESS.DEFAULT }}>
      <Paragraph className="text-sm m-0">
        The agent is inactive during standby. If you keep it running, it will
        resume activity automatically at the start of the next epoch.
      </Paragraph>
    </InfoTooltip>
  </>
);

export const AgentActivity = () => {
  const { isDeployable } = useServiceDeployment();
  const { deploymentDetails, isServiceRunning, isServiceDeploying } =
    useAgentActivity();
  const { isEligibleForRewards } = useRewardContext();
  const [IsModalOpen, setIsModalOpen] = useState(false);

  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
  };

  const healthcheckRounds = deploymentDetails?.healthcheck?.rounds || [];
  const rounds = [...healthcheckRounds].reverse();
  const roundsInfo = deploymentDetails?.healthcheck?.rounds_info || {};

  const canOpenModal = Boolean(isServiceRunning && rounds.length);

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
          content: <IdleContent />,
        };
      }
      if (rounds.length) {
        const currentRound = rounds[0];
        const roundInfo =
          roundsInfo?.[currentRound]?.name ||
          currentRound;

        return {
          status: 'running',
          content: (
            <Flex justify="space-between" align="center">
              <div>
                <CurrentActionText>Current action:</CurrentActionText>
                {roundInfo}
              </div>
              <ChevronUpDown />
            </Flex>
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

  if (isServiceRunning || isServiceDeploying ? false : !isDeployable)
    return null;

  return (
    <>
      <Container
        $status={activityInfo.status}
        onClick={() => {
          if (!canOpenModal) return;
          showModal();
        }}
      >
        <TopCorner $position="left" $status={activityInfo.status} />
        <TopCorner $position="right" $status={activityInfo.status} />
        <div style={{ width: '100%' }}>
          <Text $status={activityInfo.status}>{activityInfo.content}</Text>
        </div>
      </Container>
      <AgentActivityModal
        open={IsModalOpen && canOpenModal}
        onClose={handleClose}
        items={rounds.map((roundId, index) => {
          const info = roundsInfo?.[roundId];
          return {
            key: `${roundId}-${index}`,
            label: info?.name || `Round ${index + 1}`,
            children: info?.description || 'No details provided.',
          };
        })}
        currentActionName={(() => {
          const currentRound = rounds[0];
          if (!currentRound) return undefined;
          return roundsInfo?.[currentRound]?.name || currentRound;
        })()}
        currentActionDescription={(() => {
          const currentRound = rounds[0];
          if (!currentRound) return undefined;
          return roundsInfo?.[currentRound]?.description;
        })()}
      />
    </>
  );
};
