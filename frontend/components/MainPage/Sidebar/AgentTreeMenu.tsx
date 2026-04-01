import { Dropdown, Flex, Typography } from 'antd';
import { useCallback, useState } from 'react';
import { RiArrowDownSLine, RiArrowRightSLine } from 'react-icons/ri';
import { TbDots } from 'react-icons/tb';
import styled from 'styled-components';

import { AgentGroupHeader, TreeLine } from '@/components/ui/AgentTree';
import { COLOR } from '@/constants';

import { PulseDot } from './PulseDot';
import { RewardDot } from './RewardDot';
import { SidebarAgentGroup } from './types';

const { Text } = Typography;

type AgentTreeMenuProps = {
  groups: SidebarAgentGroup[];
  selectedServiceConfigId: string | null;
  runningServiceConfigIds: Set<string>;
  totalInstanceCount: number;
  onGroupSelect: (serviceConfigId: string) => void;
  onInstanceSelect: (serviceConfigId: string) => void;
  onArchiveRequest: (serviceConfigId: string) => void;
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

/** Visible by default; hidden when parent row is hovered so the archive button can appear. */
const RewardDotVisible = styled.span`
  display: flex;
  align-items: center;
  ${ClickableInstanceRow}:hover & {
    visibility: hidden;
  }
`;

/** Fixed-size slot that holds RewardDotVisible + InstanceArchiveDropdown side by side. */
const RewardArchiveSlot = styled.span`
  position: relative;
  display: flex;
  align-items: center;
`;

/** Hidden by default; revealed when parent row is hovered. */
const ArchiveMenuButton = styled.span`
  visibility: hidden;
  display: flex;
  align-items: center;
  padding: 2px 4px;
  border-radius: 4px;
  color: ${COLOR.TEXT_NEUTRAL_SECONDARY};
  ${ClickableInstanceRow}:hover & {
    visibility: visible;
  }
  &:hover {
    color: ${COLOR.TEXT_NEUTRAL_TERTIARY};
    background-color: ${COLOR.GRAY_3};
  }
`;

type InstanceArchiveDropdownProps = {
  instanceName: string;
  serviceConfigId: string;
  onArchiveRequest: (serviceConfigId: string) => void;
};

const InstanceArchiveDropdown = ({
  instanceName,
  serviceConfigId,
  onArchiveRequest,
}: InstanceArchiveDropdownProps) => (
  <Dropdown
    trigger={['click']}
    menu={{
      items: [
        {
          key: 'archive',
          label: 'Move to archive',
          onClick: ({ domEvent }) => {
            domEvent.stopPropagation();
            onArchiveRequest(serviceConfigId);
          },
        },
      ],
    }}
  >
    <ArchiveMenuButton
      role="button"
      aria-label={`Archive ${instanceName}`}
      onClick={(e) => e.stopPropagation()}
    >
      <TbDots size={16} />
    </ArchiveMenuButton>
  </Dropdown>
);

export const AgentTreeMenu = ({
  groups,
  selectedServiceConfigId,
  runningServiceConfigIds,
  totalInstanceCount,
  onGroupSelect,
  onInstanceSelect,
  onArchiveRequest,
}: AgentTreeMenuProps) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    if (!selectedServiceConfigId) return new Set();
    const group = groups.find((g) =>
      g.instances.some((i) => i.serviceConfigId === selectedServiceConfigId),
    );
    return group ? new Set([group.agentType]) : new Set();
  });

  // Only show archive button if there are at least 2 non-archived instances total
  const canArchive = totalInstanceCount > 1;

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
                    const showArchive = canArchive && !isRunning;

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
                        {isRunning ? (
                          <PulseDot />
                        ) : instance.hasEarnedRewards !== undefined ? (
                          <RewardArchiveSlot>
                            <RewardDotVisible>
                              <RewardDot
                                hasEarnedRewards={instance.hasEarnedRewards}
                              />
                            </RewardDotVisible>
                            {showArchive && (
                              <InstanceArchiveDropdown
                                instanceName={instance.name}
                                serviceConfigId={instance.serviceConfigId}
                                onArchiveRequest={onArchiveRequest}
                              />
                            )}
                          </RewardArchiveSlot>
                        ) : showArchive ? (
                          <InstanceArchiveDropdown
                            instanceName={instance.name}
                            serviceConfigId={instance.serviceConfigId}
                            onArchiveRequest={onArchiveRequest}
                          />
                        ) : null}
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
