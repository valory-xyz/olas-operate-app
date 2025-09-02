import { SettingOutlined } from '@ant-design/icons';
import { Button, Card, Flex, Typography } from 'antd';
import Image from 'next/image';
import styled from 'styled-components';

import { useYourWallet } from '@/components/YourWalletPage/useYourWallet';
import { AddressZero } from '@/constants/address';
import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';
import { generateName } from '@/utils/agentName';

import { AgentActivity } from './AgentActivity';
import { AgentDisabledAlert } from './AgentDisabledAlert';
import { AgentRunButton } from './AgentRunButton';

const { Title } = Typography;

const AgentInfoContainer = styled.div`
  position: relative;
`;

export const AgentInfo = () => {
  const { selectedAgentType } = useServices();
  const { goto } = usePageState();
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
          <Flex className="w-full" vertical align="flex-start">
            <Flex
              gap={12}
              justify="space-between"
              align="center"
              className="mb-16 w-full"
            >
              <Title level={5} className="m-0">
                {generateName(serviceSafe?.address ?? AddressZero)}
              </Title>
              <Button
                onClick={() => goto(Pages.UpdateAgentTemplate)}
                icon={<SettingOutlined />}
              />
            </Flex>
            <AgentRunButton />
          </Flex>
        </Flex>
        <AgentDisabledAlert />
        <AgentActivity />
      </AgentInfoContainer>
    </Card>
  );
};
