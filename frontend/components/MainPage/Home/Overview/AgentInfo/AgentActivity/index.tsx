import { Flex, Typography } from 'antd';
import { ReactNode, useMemo } from 'react';
import { LuChevronsUpDown } from 'react-icons/lu';
import styled from 'styled-components';
import { useBoolean } from 'usehooks-ts';

import { InfoTooltip } from '@/components/ui';
import { COLOR } from '@/constants';
import {
  useAgentActivity,
  useRewardContext,
  useServiceDeployment,
} from '@/hooks';

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
  const { isDeployable } = useServiceDeployment();
  const { deploymentDetails, isServiceRunning, isServiceDeploying } =
    useAgentActivity();
  const { isEligibleForRewards } = useRewardContext();
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

  const canOpenModal = isServiceRunning && !!rounds.length;

  const activityInfo = useMemo<{
    status: AgentStatus;
    content: string | ReactNode;
  }>(() => {
    if (isServiceDeploying) {
      return { status: 'loading', content: 'Agent is loading' };
    }

    if (isServiceRunning) {
      if (isEligibleForRewards) {
        return { status: 'idle', content: <IdleContent /> };
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

      return {
        status: 'activity-not-ready',
        content: 'Agent is running',
      };
    }

    return { status: 'not-running', content: 'Agent is not running' };
  }, [
    isEligibleForRewards,
    isServiceDeploying,
    isServiceRunning,
    rounds,
    roundsInfo,
  ]);

  if (isServiceRunning || isServiceDeploying ? false : !isDeployable) {
    return null;
  }

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
