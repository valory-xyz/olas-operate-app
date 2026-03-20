import { Flex, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { RiArrowDownSLine, RiArrowRightSLine } from 'react-icons/ri';
import styled from 'styled-components';

import { AgentGroupHeader, TreeLine } from '@/components/ui/AgentTree';
import { COLOR } from '@/constants';

import { PulseDot } from './PulseDot';
import { SidebarAgentGroup } from './types';

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

const ClickableInstanceRow = styled(Flex)<{ $isSelected: boolean }>`
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
    if (group) {
      setExpandedGroups((prev) => {
        if (prev.has(group.agentType)) return prev;
        return new Set([...prev, group.agentType]);
      });
    }
  }, [selectedServiceConfigId, groups]);

  const toggleGroup = useCallback(
    (agentType: string) => {
      setExpandedGroups((prev) => {
        const next = new Set(prev);
        if (next.has(agentType)) {
          next.delete(agentType);
          return next;
        }
        next.add(agentType);
        return next;
      });

      if (!expandedGroups.has(agentType)) {
        const group = groups.find((group) => group.agentType === agentType);
        // Only select first instance if no instance in this group is already selected
        const alreadySelected = group?.instances.some(
          (instance) => instance.serviceConfigId === selectedServiceConfigId,
        );
        if (!alreadySelected && group?.instances[0]) {
          onGroupSelect(group.instances[0].serviceConfigId);
        }
      }
    },
    [expandedGroups, groups, onGroupSelect, selectedServiceConfigId],
  );

  return (
    <Flex vertical>
      {groups.map((group) => {
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
              <AgentGroupHeader agentType={group.agentType}>
                {!isExpanded && hasRunningInstance && <PulseDot />}
              </AgentGroupHeader>
            </GroupHeader>

            {isExpanded && (
              <Flex style={{ padding: '4px 8px' }} gap={10}>
                <TreeLine />
                <Flex vertical style={{ flex: 1, minWidth: 0 }}>
                  {group.instances.map((instance) => {
                    const isSelected =
                      instance.serviceConfigId === selectedServiceConfigId;
                    const isRunning = runningServiceConfigIds.has(
                      instance.serviceConfigId,
                    );

                    return (
                      <ClickableInstanceRow
                        key={instance.serviceConfigId}
                        $isSelected={isSelected}
                        align="center"
                        justify="space-between"
                        gap={8}
                        onClick={() =>
                          onInstanceSelect(instance.serviceConfigId)
                        }
                      >
                        <Text
                          ellipsis
                          style={{ fontSize: 14, lineHeight: '20px' }}
                        >
                          {instance.name}
                        </Text>
                        {isRunning && <PulseDot />}
                      </ClickableInstanceRow>
                    );
                  })}
                </Flex>
              </Flex>
            )}
          </div>
        );
      })}
    </Flex>
  );
};
