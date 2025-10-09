import { Flex, Typography } from 'antd';
import { useMemo } from 'react';
import styled from 'styled-components';
import { useBoolean } from 'usehooks-ts';

import { ChevronUpDown } from '@/components/custom-icons/ChevronUpDown';
import { InfoTooltip } from '@/components/InfoTooltip';
import { COLOR } from '@/constants/colors';
import { useServiceDeployment } from '@/hooks';
import { useAgentActivity } from '@/hooks/useAgentActivity';
import { useRewardContext } from '@/hooks/useRewardContext';

import { AgentActivityModal } from './AgentActivityModal';
import { Container, Text, TopCorner } from './styles';
import { AgentStatus } from './types';

const { Paragraph } = Typography;

const RoundInfoContainer = styled.div`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 500px;
`;

const CurrentActionText = styled.span`
  color: ${COLOR.PURPLE_2};
  white-space: nowrap;
  width: fit-content;
`;

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
  const {
    value: isModalOpen,
    setTrue: showModal,
    setFalse: handleClose,
  } = useBoolean(false);

  const healthcheckRounds = useMemo(() => {
    return deploymentDetails?.healthcheck?.rounds || [];
  }, [deploymentDetails?.healthcheck?.rounds]);

  const rounds = useMemo(() => {
    return [...healthcheckRounds].reverse();
  }, [healthcheckRounds]);

  const roundsInfo = useMemo(() => {
    return deploymentDetails?.healthcheck?.rounds_info;
  }, [deploymentDetails?.healthcheck?.rounds_info]);

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

      if (rounds.length > 0) {
        const currentRound = rounds[0];
        const roundInfo = roundsInfo?.[currentRound]?.name || currentRound;

        return {
          status: 'running',
          content: (
            <Flex justify="space-between" align="top" gap={6}>
              <CurrentActionText>Current action:</CurrentActionText>
              <RoundInfoContainer>{roundInfo}</RoundInfoContainer>
              <ChevronUpDown className="ml-auto" />
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
    isEligibleForRewards,
    isServiceDeploying,
    isServiceRunning,
    rounds,
    roundsInfo,
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
        <Text
          $status={activityInfo.status}
          className="activity-modal text-center"
        >
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
