import { Badge } from 'antd';
import Image from 'next/image';

import { DeploymentStatus } from '@/client';
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

export const AgentHead = () => {
  const { serviceStatus } = useServices();
  if (
    serviceStatus === DeploymentStatus.DEPLOYING ||
    serviceStatus === DeploymentStatus.STOPPING
  )
    return <TransitionalAgentHead />;
  if (serviceStatus === DeploymentStatus.DEPLOYED) return <DeployedAgentHead />;
  return <StoppedAgentHead />;
};
