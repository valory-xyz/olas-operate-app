import { Badge } from 'antd';
import { useLottie } from 'lottie-react';
import Image from 'next/image';
import styled from 'styled-components';

import { MiddlewareDeploymentStatus } from '@/client';
import { useReward } from '@/hooks/useReward';
import { useServices } from '@/hooks/useServices';

const badgeOffset: [number, number] = [-5, 32.5];

const AnimationContainer = styled.div`
  width: 40px;
  height: 40px;
  > div {
    width: 100%;
    height: 100%;
  }
`;

const TransitionalAgentHead = () => (
  <Badge status="processing" color="orange" dot offset={badgeOffset}>
    <Image src="/happy-robot.svg" alt="Happy Robot" width={40} height={40} />
  </Badge>
);

const DeployedAgentHead = () => {
  const { View } = useLottie({
    animationData: require('../../ui/animations/robot-running.json'),
    loop: true,
    autoplay: true,
  });
  // return <div style={{ width: 40, height: 40 }}>{View}</div>;

  return <AnimationContainer>{View}</AnimationContainer>;
};

const StoppedAgentHead = () => (
  <Badge dot color="red" offset={badgeOffset}>
    <Image src="/sad-robot.svg" alt="Sad Robot" width={40} height={40} />
  </Badge>
);

const IdleAgentHead = () => (
  <Badge dot status="processing" color="green" offset={badgeOffset}>
    <Image src="/idle-robot.svg" alt="Idle Robot" width={40} height={40} />
  </Badge>
);

export const AgentHead = () => {
  const { selectedService } = useServices();
  const { isEligibleForRewards } = useReward();
  const status = selectedService?.deploymentStatus;

  // return <TransitionalAgentHead />;
  return <DeployedAgentHead />;

  if (
    status === MiddlewareDeploymentStatus.DEPLOYING ||
    status === MiddlewareDeploymentStatus.STOPPING
  ) {
    return <TransitionalAgentHead />;
  }

  if (status === MiddlewareDeploymentStatus.DEPLOYED) {
    // If the agent is eligible for rewards, agent is idle
    return isEligibleForRewards ? <IdleAgentHead /> : <DeployedAgentHead />;
  }
  return <StoppedAgentHead />;
};
