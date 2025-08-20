import { Card, Flex, Tag, Typography } from 'antd';
import { kebabCase } from 'lodash';
import Image from 'next/image';

import { useYourWallet } from '@/components/YourWalletPage/useYourWallet';
import { CHAIN_CONFIG } from '@/config/chains';
import { AddressZero } from '@/constants/address';
import { useServices } from '@/hooks/useServices';
import { generateName } from '@/utils/agentName';

import { AgentRunButton } from './AgentRunButton';

const { Title, Text } = Typography;

export const AgentInfo = () => {
  const { selectedAgentType, selectedAgentConfig } = useServices();
  const { serviceSafe } = useYourWallet();

  const agentName = selectedAgentConfig.name;
  const homeChainId = selectedAgentConfig.evmHomeChainId;
  const chainName = CHAIN_CONFIG[homeChainId].name;
  const chainColor = CHAIN_CONFIG[homeChainId].color;

  return (
    <Card bordered={false}>
      <Flex justify="start" align="center" gap={24}>
        <Image
          src={`/agent-${selectedAgentType}-icon.png`}
          width={128}
          height={128}
          alt={selectedAgentType}
        />
        <div>
          <Flex vertical gap={12} className="mb-16">
            <Title level={5} className="m-0">
              {generateName(serviceSafe?.address ?? AddressZero)}
            </Title>
            <Flex className="mb-4">
              <Tag bordered={false}>{agentName}</Tag>
              <Tag bordered={false} color={chainColor}>
                <Flex align="center" gap={6}>
                  <Image
                    src={`/chains/${kebabCase(chainName)}-chain.png`}
                    width={14}
                    height={14}
                    alt={`${chainName} logo`}
                  />{' '}
                  <Text className="text-sm">{chainName} chain</Text>
                </Flex>
              </Tag>
            </Flex>
          </Flex>
          <AgentRunButton />
        </div>
      </Flex>
    </Card>
  );
};
