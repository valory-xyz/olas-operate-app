import { InfoCircleOutlined, SettingOutlined } from '@ant-design/icons';
import { Flex, Modal, Typography } from 'antd';
import { kebabCase } from 'lodash';
import Image from 'next/image';
import { useState } from 'react';
import { LuInfo } from 'react-icons/lu';
import styled from 'styled-components';

import { AgentIntroduction } from '@/components/AgentIntroduction';
import { CardFlex, Tooltip, usePageTransitionValue } from '@/components/ui';
import { CHAIN_CONFIG } from '@/config/chains';
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

const IconButton = styled(Flex)`
  padding: 8px;
  cursor: pointer;
  border-radius: 10px;
  background: ${COLOR.WHITE};
  border: 1px solid ${COLOR.BORDER_GRAY};

  &:hover {
    background: ${COLOR.GRAY_1};
  }
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
      <IconButton
        align="center"
        justify="center"
        onClick={() => setIsAboutAgentModalOpen(true)}
      >
        <InfoCircleOutlined style={{ fontSize: 20 }} />
      </IconButton>
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

const ChainBadge = () => {
  const { selectedAgentConfig } = useServices();
  const chainConfig = CHAIN_CONFIG[selectedAgentConfig.evmHomeChainId];
  const chainName = chainConfig?.name;

  if (!chainName) return null;
  return (
    <Tooltip
      title={`${selectedAgentConfig.displayName} is operating on ${chainName} chain`}
    >
      <IconButton align="center" justify="center" style={{ padding: 10 }}>
        <Image
          src={`/chains/${kebabCase(chainName)}-chain.png`}
          alt={`${chainName} logo`}
          width={16}
          height={16}
        />
      </IconButton>
    </Tooltip>
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
  const displayedAgentType = usePageTransitionValue(selectedAgentType);
  const displayedAgentName = usePageTransitionValue(
    selectedAgentNameOrFallback,
  );

  return (
    <Flex vertical>
      <CardFlex $noBorder>
        <AgentInfoContainer>
          <Flex justify="start" align="center" gap={24}>
            <Image
              key={displayedAgentType}
              src={`/agent-${displayedAgentType}-icon.png`}
              width={88}
              height={88}
              alt={displayedAgentType}
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
                  {displayedAgentName}
                </Title>
                <Flex gap={8} align="center">
                  <ChainBadge />
                  <AboutAgent />
                  {isX402Enabled
                    ? null
                    : selectedAgentConfig.requiresSetup && (
                        <Tooltip title="Agent settings">
                          <IconButton
                            align="center"
                            justify="center"
                            onClick={() => goto(PAGES.UpdateAgentTemplate)}
                          >
                            <SettingOutlined style={{ fontSize: 20 }} />
                          </IconButton>
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

      <AgentActivity key={displayedAgentType} />
    </Flex>
  );
};
