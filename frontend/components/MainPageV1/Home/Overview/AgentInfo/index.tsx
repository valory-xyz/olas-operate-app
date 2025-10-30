import { InfoCircleOutlined, SettingOutlined } from '@ant-design/icons';
import { Button, Flex, Modal, Typography } from 'antd';
import Image from 'next/image';
import { useState } from 'react';
import styled from 'styled-components';

import { AgentIntroduction } from '@/components/AgentIntroduction';
import { CardFlex, Tooltip } from '@/components/ui';
import { useYourWallet } from '@/components/YourWalletPage/useYourWallet';
import { AddressZero } from '@/constants/address';
import { Pages } from '@/enums/Pages';
import { usePageState, useServices } from '@/hooks';
import { generateName } from '@/utils';

import { AgentActivity } from './AgentActivity';
import { AgentDisabledAlert } from './AgentDisabledAlert';
import { AgentRunButton } from './AgentRunButton';

const { Title } = Typography;

const AgentInfoContainer = styled.div`
  position: relative;
`;

const AboutAgent = () => {
  const { selectedAgentType } = useServices();
  const [isAboutAgentModalOpen, setIsAboutAgentModalOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsAboutAgentModalOpen(true)}
        icon={<InfoCircleOutlined />}
      />
      {isAboutAgentModalOpen && (
        <Modal
          open
          onCancel={() => setIsAboutAgentModalOpen(false)}
          title="About Agent"
          footer={null}
          width={460}
          style={{ top: 40 }}
        >
          <AgentIntroduction
            agentType={selectedAgentType}
            styles={{ imageHeight: 360, descPadding: '0px' }}
          />
        </Modal>
      )}
    </>
  );
};

export const AgentInfo = () => {
  const { selectedAgentType, selectedAgentConfig } = useServices();
  const { goto } = usePageState();
  const { serviceSafe } = useYourWallet();

  const { isX402Enabled } = selectedAgentConfig;

  return (
    <Flex vertical>
      <CardFlex $noBorder>
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
                <Flex gap={12} align="center">
                  <AboutAgent />
                  {isX402Enabled ? null : (
                    <Tooltip title="Agent settings">
                      <Button
                        onClick={() => goto(Pages.UpdateAgentTemplate)}
                        icon={<SettingOutlined />}
                      />
                    </Tooltip>
                  )}
                </Flex>
              </Flex>
              <AgentRunButton />
            </Flex>
          </Flex>
          <AgentDisabledAlert />
        </AgentInfoContainer>
      </CardFlex>

      <AgentActivity />
    </Flex>
  );
};
