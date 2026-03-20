import { Flex, Typography } from 'antd';
import Image from 'next/image';
import styled from 'styled-components';

import { AGENT_CONFIG } from '@/config/agents';
import { AgentType, COLOR } from '@/constants';

const { Text } = Typography;

export const TreeLine = styled.div`
  width: 16px;
  flex-shrink: 0;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 0;
    bottom: 0;
    width: 1.5px;
    background: ${COLOR.GRAY_4};
    border-radius: 1px;
  }
`;

type AgentGroupHeaderProps = {
  agentType: AgentType;
  /** Rendered after the display name (e.g. running dot). */
  children?: React.ReactNode;
};

/** Agent icon + display name. Pass children for trailing elements. */
export const AgentGroupHeader = ({
  agentType,
  children,
}: AgentGroupHeaderProps) => {
  const config = AGENT_CONFIG[agentType];
  return (
    <>
      <Image
        src={`/agent-${agentType}-icon.png`}
        alt={config.displayName}
        width={28}
        height={28}
        style={{ borderRadius: 5.25 }}
      />
      <Flex
        justify="space-between"
        align="center"
        style={{ flex: 1, minWidth: 0 }}
      >
        <Text ellipsis style={{ fontSize: 14, lineHeight: '20px' }}>
          {config.displayName}
        </Text>
        {children}
      </Flex>
    </>
  );
};

export type AgentTreeInstance = {
  serviceConfigId: string;
  name: string;
};

type InstanceListProps = {
  instances: AgentTreeInstance[];
  /** Render trailing content per instance (action button, running dot, etc.). */
  renderTrailing?: (serviceConfigId: string) => React.ReactNode;
};

/**
 * Tree-indented list of instances with a vertical tree line.
 * Used by both the sidebar tree and the auto-run popover.
 */
export const InstanceList = ({
  instances,
  renderTrailing,
}: InstanceListProps) => (
  <Flex style={{ padding: '4px 8px' }} gap={10}>
    <TreeLine />
    <Flex vertical style={{ flex: 1, minWidth: 0 }}>
      {instances.map((instance) => (
        <Flex
          key={instance.serviceConfigId}
          align="center"
          justify="space-between"
          gap={8}
          style={{ padding: '4px 0' }}
        >
          <Text ellipsis style={{ fontSize: 14, lineHeight: '20px' }}>
            {instance.name}
          </Text>
          {renderTrailing?.(instance.serviceConfigId)}
        </Flex>
      ))}
    </Flex>
  </Flex>
);

type AgentGroupProps = {
  agentType: AgentType;
  instances: AgentTreeInstance[];
  /** Rendered after the display name in the group header. */
  headerTrailing?: React.ReactNode;
  /** Render trailing content per instance row. */
  renderInstanceTrailing?: (serviceConfigId: string) => React.ReactNode;
};

/** A complete agent group: header + indented instance list. */
export const AgentGroup = ({
  agentType,
  instances,
  headerTrailing,
  renderInstanceTrailing,
}: AgentGroupProps) => (
  <Flex vertical>
    <Flex align="center" gap={8} style={{ padding: '4px 0' }}>
      <AgentGroupHeader agentType={agentType}>
        {headerTrailing}
      </AgentGroupHeader>
    </Flex>
    <InstanceList
      instances={instances}
      renderTrailing={renderInstanceTrailing}
    />
  </Flex>
);
