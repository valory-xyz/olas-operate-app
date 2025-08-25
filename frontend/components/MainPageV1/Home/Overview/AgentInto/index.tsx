import { Card, Flex, Typography } from 'antd';
import Image from 'next/image';
import styled from 'styled-components';

import { useYourWallet } from '@/components/YourWalletPage/useYourWallet';
import { AddressZero } from '@/constants/address';
import { useServices } from '@/hooks/useServices';
import { generateName } from '@/utils/agentName';

import { AgentActivity } from './AgentActivity';
import { AgentRunButton } from './AgentRunButton';

const { Title } = Typography;

const AgentInfoContainer = styled.div`
  position: relative;
`;

export const AgentInfo = () => {
  const { selectedAgentType } = useServices();
  const { serviceSafe } = useYourWallet();

  return (
    <Card variant="borderless">
      <AgentInfoContainer>
        <Flex justify="start" align="center" gap={24}>
          <Image
            src={`/agent-${selectedAgentType}-icon.png`}
            width={88}
            height={88}
            alt={selectedAgentType}
          />
          <div>
            <Flex vertical gap={12} className="mb-16">
              <Title level={5} className="m-0">
                {generateName(serviceSafe?.address ?? AddressZero)}
              </Title>
            </Flex>
            <AgentRunButton />
          </div>
        </Flex>
        <AgentActivity />
      </AgentInfoContainer>
    </Card>
  );
};
