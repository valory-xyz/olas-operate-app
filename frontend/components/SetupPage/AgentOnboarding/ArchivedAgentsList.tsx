import { Flex, Typography } from 'antd';
import Image from 'next/image';
import { useMemo } from 'react';
import styled from 'styled-components';

import { ACTIVE_AGENTS } from '@/config/agents';
import { COLOR } from '@/constants';
import { useArchivedAgents, useServices } from '@/hooks';
import { getServiceInstanceName, isServiceOfAgent } from '@/utils';

const { Text } = Typography;

const AgentSelectionContainer = styled(Flex)<{ active?: boolean }>`
  padding: 12px 24px;
  cursor: pointer;
  background-color: ${({ active }) => (active ? COLOR.GRAY_1 : COLOR.WHITE)};
  border-bottom: 1px solid ${COLOR.GRAY_4};
  border-left: 1px solid ${COLOR.WHITE};
  &:hover {
    background-color: ${COLOR.GRAY_1};
  }
`;

type ArchivedInstance = {
  serviceConfigId: string;
  name: string;
  agentIcon: string;
};

type ArchivedAgentsListProps = {
  selectedInstance?: string;
  onSelectInstance: (serviceConfigId: string) => void;
};

export const ArchivedAgentsList = ({
  selectedInstance,
  onSelectInstance,
}: ArchivedAgentsListProps) => {
  const { archivedInstances } = useArchivedAgents();
  const { services } = useServices();

  const archivedItems = useMemo<ArchivedInstance[]>(() => {
    if (!services) return [];
    return archivedInstances
      .map((serviceConfigId) => {
        const service = services.find(
          (s) => s.service_config_id === serviceConfigId,
        );
        if (!service) return null;

        const agentEntry = ACTIVE_AGENTS.find(([, config]) =>
          isServiceOfAgent(service, config),
        );
        if (!agentEntry) return null;

        const [agentType, config] = agentEntry;
        return {
          serviceConfigId,
          name: getServiceInstanceName(
            service,
            config.displayName,
            config.evmHomeChainId,
          ),
          agentIcon: `/agent-${agentType}-icon.png`,
        };
      })
      .filter((item): item is ArchivedInstance => item !== null);
  }, [archivedInstances, services]);

  if (archivedItems.length === 0) {
    return (
      <Flex
        align="center"
        justify="center"
        className="p-24"
        style={{ color: COLOR.TEXT_NEUTRAL_TERTIARY }}
      >
        <Text type="secondary">No archived agents.</Text>
      </Flex>
    );
  }

  return (
    <>
      {archivedItems.map((item) => (
        <AgentSelectionContainer
          key={item.serviceConfigId}
          active={selectedInstance === item.serviceConfigId}
          onClick={() => onSelectInstance(item.serviceConfigId)}
          gap={12}
          align="center"
        >
          <Image
            src={item.agentIcon}
            alt={`${item.name} icon`}
            width={36}
            height={36}
            style={{ borderRadius: 8, border: `1px solid ${COLOR.GRAY_3}` }}
          />
          <Text>{item.name}</Text>
        </AgentSelectionContainer>
      ))}
    </>
  );
};
