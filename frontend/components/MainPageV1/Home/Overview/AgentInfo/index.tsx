import { InfoCircleOutlined, SettingOutlined } from '@ant-design/icons';
import { Button, Flex, Modal, Typography } from 'antd';
import Image from 'next/image';
import { useState } from 'react';
import styled from 'styled-components';

import { AgentIntroduction } from '@/components/AgentIntroduction';
import { CardFlex, Tooltip } from '@/components/ui';
import { NA, PAGES } from '@/constants';
import { usePageState, useServices } from '@/hooks';

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
  const { goto } = usePageState();
  const { selectedAgentType, selectedAgentConfig, selectedAgentName } =
    useServices();

  const { isX402Enabled } = selectedAgentConfig;

  return (
    <Flex vertical>
      <CardFlex $noBorder>
        <AgentInfoContainer>
          <Flex justify="start" align="center" gap={24}>
            <Image
              key={selectedAgentType}
              src={`/agent-${selectedAgentType}-icon.png`}
              width={88}
              height={88}
              alt={selectedAgentType}
              className="rounded-12"
            />
            <Flex className="w-full" vertical align="flex-start">
              <Flex
                gap={12}
                justify="space-between"
                align="center"
                className="mb-16 w-full"
              >
                <Title level={5} className="m-0">
                  {selectedAgentName || NA}
                </Title>
                <Flex gap={12} align="center">
                  <AboutAgent />
                  {isX402Enabled
                    ? null
                    : selectedAgentConfig.requiresSetup && (
                        <Tooltip title="Agent settings">
                          <Button
                            onClick={() => goto(PAGES.UpdateAgentTemplate)}
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
