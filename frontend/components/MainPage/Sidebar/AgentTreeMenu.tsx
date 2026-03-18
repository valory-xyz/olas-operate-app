import { Flex, Typography } from 'antd';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { RiArrowDownSLine, RiArrowRightSLine } from 'react-icons/ri';
import styled from 'styled-components';

import { AGENT_CONFIG } from '@/config/agents';
import { COLOR } from '@/constants';

import { PulseDot } from './PulseDot';
import { SidebarAgentGroup, SidebarInstance } from './types';

const { Text } = Typography;

type AgentTreeMenuProps = {
  groups: SidebarAgentGroup[];
  selectedServiceConfigId: string | null;
  runningServiceConfigIds: Set<string>;
  onGroupSelect: (serviceConfigId: string) => void;
  onInstanceSelect: (serviceConfigId: string) => void;
};

const GroupHeader = styled(Flex)`
  cursor: pointer;
  padding: 4px 16px 4px 8px;
  border-radius: 8px;

  &:hover {
    background: ${COLOR.GRAY_1};
  }
`;

const TreeLine = styled.div`
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

const InstanceRow = styled(Flex)<{ $isSelected: boolean }>`
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 14px;
  background: ${({ $isSelected }) =>
    $isSelected ? COLOR.GRAY_1 : 'transparent'};

  &:hover {
    background: ${COLOR.GRAY_1};
  }
`;

type ExpandedInstancesProps = {
  instances: SidebarInstance[];
  selectedServiceConfigId: string | null;
  runningServiceConfigIds: Set<string>;
  onInstanceSelect: (serviceConfigId: string) => void;
};

const ExpandedInstances = ({
  instances,
  selectedServiceConfigId,
  runningServiceConfigIds,
  onInstanceSelect,
}: ExpandedInstancesProps) => (
  <Flex style={{ padding: '4px 8px' }} gap={10}>
    <TreeLine />
    <Flex vertical style={{ flex: 1, minWidth: 0 }}>
      {instances.map((instance) => {
        const isSelected = instance.serviceConfigId === selectedServiceConfigId;
        const isRunning = runningServiceConfigIds.has(instance.serviceConfigId);

        return (
          <InstanceRow
            key={instance.serviceConfigId}
            $isSelected={isSelected}
            align="center"
            justify="space-between"
            gap={8}
            onClick={() => onInstanceSelect(instance.serviceConfigId)}
          >
            <Text ellipsis style={{ fontSize: 14, lineHeight: '20px' }}>
              {instance.name}
            </Text>
            {isRunning && <PulseDot />}
          </InstanceRow>
        );
      })}
    </Flex>
  </Flex>
);

export const AgentTreeMenu = ({
  groups,
  selectedServiceConfigId,
  runningServiceConfigIds,
  onGroupSelect,
  onInstanceSelect,
}: AgentTreeMenuProps) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!selectedServiceConfigId) return;

    const group = groups.find((g) =>
      g.instances.some((i) => i.serviceConfigId === selectedServiceConfigId),
    );
    if (group && !expandedGroups.has(group.agentType)) {
      setExpandedGroups((prev) => new Set([...prev, group.agentType]));
    }
  }, [selectedServiceConfigId, groups, expandedGroups]);

  const toggleGroup = useCallback(
    (agentType: string) => {
      setExpandedGroups((prev) => {
        const next = new Set(prev);
        if (next.has(agentType)) {
          next.delete(agentType);
        } else {
          next.add(agentType);
        }
        return next;
      });

      const group = groups.find((g) => g.agentType === agentType);
      if (group?.instances[0]) {
        onGroupSelect(group.instances[0].serviceConfigId);
      }
    },
    [groups, onGroupSelect],
  );

  return (
    <Flex vertical>
      {groups.map((group) => {
        const config = AGENT_CONFIG[group.agentType];
        const isExpanded = expandedGroups.has(group.agentType);
        const hasRunningInstance = group.instances.some((i) =>
          runningServiceConfigIds.has(i.serviceConfigId),
        );

        return (
          <div key={group.agentType}>
            <GroupHeader
              align="center"
              gap={10}
              onClick={() => toggleGroup(group.agentType)}
            >
              {isExpanded ? (
                <RiArrowDownSLine size={16} color={COLOR.TEXT_LIGHT} />
              ) : (
                <RiArrowRightSLine size={16} color={COLOR.TEXT_LIGHT} />
              )}
              <Image
                src={`/agent-${group.agentType}-icon.png`}
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
                {!isExpanded && hasRunningInstance && <PulseDot />}
              </Flex>
            </GroupHeader>

            {isExpanded && (
              <ExpandedInstances
                instances={group.instances}
                selectedServiceConfigId={selectedServiceConfigId}
                runningServiceConfigIds={runningServiceConfigIds}
                onInstanceSelect={onInstanceSelect}
              />
            )}
          </div>
        );
      })}
    </Flex>
  );
};
