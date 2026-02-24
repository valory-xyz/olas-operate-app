import { InfoCircleOutlined, SettingOutlined } from '@ant-design/icons';
import { Button, Flex, Modal, Typography } from 'antd';
import Image from 'next/image';
import { useState } from 'react';
import { LuInfo } from 'react-icons/lu';
import styled from 'styled-components';

import { AgentIntroduction } from '@/components/AgentIntroduction';
import { CardFlex, Tooltip } from '@/components/ui';
import { COLOR, PAGES } from '@/constants';
import { useAutoRunContext } from '@/context/AutoRunProvider';
import { usePageState, useServices } from '@/hooks';

import { AgentActivity } from './AgentActivity';
import { AgentDisabledAlert } from './AgentDisabledAlert';
import { AgentRunButton } from './AgentRunButton';

const { Title, Text } = Typography;

const AgentInfoContainer = styled.div`
  position: relative;
`;

const AutoRunAlertContainer = styled(Flex)`
  background-color: ${COLOR.PURPLE_LIGHT_3};
  border-radius: 6px;
  padding: 2px 8px;
`;

const AutoRunAlert = () => (
  <Flex align="self-end" style={{ height: 40 }}>
    <Tooltip
      title="Selected agents will run in sequence automatically. To change which agents are included, use the auto-run toggle."
      styles={{ body: { width: 324 } }}
    >
      <AutoRunAlertContainer align="center" gap={6}>
        <Text className="text-sm text-primary">Auto-run is on</Text>
        <LuInfo color={COLOR.PRIMARY} />
      </AutoRunAlertContainer>
    </Tooltip>
  </Flex>
);

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
  const {
    selectedAgentType,
    selectedAgentConfig,
    selectedAgentNameOrFallback,
  } = useServices();
  const { enabled: isAutoRunEnabled } = useAutoRunContext();

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
                  {selectedAgentNameOrFallback}
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
              {isAutoRunEnabled ? <AutoRunAlert /> : <AgentRunButton />}
            </Flex>
          </Flex>
          <AgentDisabledAlert />
        </AgentInfoContainer>
      </CardFlex>

      <AgentActivity />
    </Flex>
  );
};
