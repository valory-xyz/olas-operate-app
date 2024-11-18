import { Badge } from 'antd';
import Image from 'next/image';

import { MiddlewareDeploymentStatus } from '@/client';
import { useReward } from '@/hooks/useReward';
import { useServices } from '@/hooks/useServices';

const badgeOffset: [number, number] = [-5, 32.5];

const TransitionalAgentHead = () => (
  <Badge status="processing" color="orange" dot offset={badgeOffset}>
    <Image src="/happy-robot.svg" alt="Happy Robot" width={40} height={40} />
  </Badge>
);

const DeployedAgentHead = () => (
  <Badge status="processing" color="green" dot offset={badgeOffset}>
    <Image src="/happy-robot.svg" alt="Happy Robot" width={40} height={40} />
  </Badge>
);

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
  const { serviceStatus } = useServices();
  const { isEligibleForRewards } = useReward();

  if (
    serviceStatus === MiddlewareDeploymentStatus.DEPLOYING ||
    serviceStatus === MiddlewareDeploymentStatus.STOPPING
  ) {
    return <TransitionalAgentHead />;
  }

  if (serviceStatus === MiddlewareDeploymentStatus.DEPLOYED) {
    // If the agent is eligible for rewards, agent is idle
    return isEligibleForRewards ? <IdleAgentHead /> : <DeployedAgentHead />;
  }
  return <StoppedAgentHead />;
};
