import {
  Button,
  Divider,
  Flex,
  Image,
  Popover,
  Switch,
  Tooltip,
  Typography,
} from 'antd';
import { ReactNode, useMemo } from 'react';
import { LuCircleMinus, LuCirclePlus, LuRefreshCcw } from 'react-icons/lu';
import styled from 'styled-components';

import { AGENT_CONFIG } from '@/config/agents';
import { AgentType, COLOR } from '@/constants';
import { useAutoRunContext } from '@/context/AutoRunProvider';
import { useAgentRunning, useServiceDeployment } from '@/hooks';
import { Nullable } from '@/types';

const { Text } = Typography;

const Container = styled(Flex)<{ $enabled: boolean }>`
  background-color: ${({ $enabled }) =>
    $enabled ? COLOR.PURPLE_LIGHT_3 : COLOR.GRAY_4};
  border-radius: 10px;
  padding: 4px 4px 4px 10px;
`;

const PopoverSection = styled(Flex)<{ $small?: boolean }>`
  padding: ${({ $small }) => ($small ? '8px 16px' : '12px 16px')};
`;

type AgentRowProps = {
  agentType: AgentType;
  tooltip?: Nullable<string>;
  action?: {
    icon: ReactNode;
    onClick: () => void;
    isDanger?: boolean;
    isDisabled?: boolean;
  };
};
const AgentRow = ({ agentType, tooltip, action }: AgentRowProps) => {
  const name = AGENT_CONFIG[agentType].displayName;

  return (
    <Flex justify="space-between" align="center" gap={12} className="w-full">
      <Flex align="center" gap={8}>
        <Image
          src={`/agent-${agentType}-icon.png`}
          width={28}
          height={28}
          alt={name}
          style={{ borderRadius: 8, border: `1px solid ${COLOR.GRAY_3}` }}
        />
        <Flex vertical gap={4}>
          <Text className="text-sm">{name}</Text>
        </Flex>
      </Flex>
      {action && (
        <Tooltip title={tooltip} placement="right">
          <Button
            size="small"
            type="text"
            danger={action.isDanger}
            disabled={action.isDisabled}
            onClick={action.onClick}
            icon={action.icon}
          />
        </Tooltip>
      )}
    </Flex>
  );
};

export const AutoRunControl = () => {
  const {
    enabled,
    includedAgents,
    excludedAgents,
    eligibilityByAgent,
    isToggling,
    setEnabled,
    includeAgent,
    excludeAgent,
  } = useAutoRunContext();
  const { runningAgentType } = useAgentRunning();
  const { isLoading: isServiceDeploymentLoading } = useServiceDeployment();

  // Preserve order from the store, but only pass the types to render rows.
  const includedAgentTypes = useMemo(
    () => includedAgents.map((agent) => agent.agentType),
    [includedAgents],
  );

  // Popover shows two lists:
  // - Included agents (can run) with "-" action to exclude
  // - Excluded agents with "+" action to include
  const popoverContent = (
    <Flex vertical gap={0} style={{ width: 260 }}>
      <PopoverSection vertical gap={8}>
        <Flex align="center" justify="space-between">
          <Text strong>Auto-run</Text>
          <Switch
            checked={enabled}
            onChange={setEnabled}
            loading={isToggling || isServiceDeploymentLoading}
            disabled={isServiceDeploymentLoading}
            size="small"
          />
        </Flex>
        <Text
          className="text-neutral-tertiary text-sm flex"
          style={{ width: 200 }}
        >
          Runs agents one after another, automatically..
        </Text>
      </PopoverSection>

      {enabled ? (
        <Flex vertical>
          <PopoverSection>
            <Flex vertical gap={8} className="w-full">
              {includedAgentTypes.length === 0 ? (
                <Text type="secondary">No agents enabled.</Text>
              ) : (
                includedAgentTypes.map((agentType) => {
                  const isRunning = agentType === runningAgentType;
                  const isLastIncluded = includedAgentTypes.length <= 1;
                  const tooltip = (() => {
                    if (isRunning)
                      return 'Can’t exclude: agent is currently running';
                    if (isLastIncluded)
                      return 'Can’t exclude the last enabled agent';
                    return 'Exclude agent from auto-run';
                  })();
                  return (
                    <AgentRow
                      key={`included-${agentType}`}
                      agentType={agentType}
                      action={{
                        isDisabled: isRunning || isLastIncluded,
                        onClick: () => excludeAgent(agentType),
                        isDanger: true,
                        icon: <LuCircleMinus size={16} />,
                      }}
                      tooltip={tooltip}
                    />
                  );
                })
              )}
            </Flex>
          </PopoverSection>

          {excludedAgents.length === 0 ? null : (
            <Flex vertical>
              <PopoverSection>
                <Text className="text-sm">Excluded from auto-run</Text>
              </PopoverSection>
              <Divider className="m-0" />
              <PopoverSection $small vertical gap={8}>
                {excludedAgents.map((agentType) => {
                  const isBlocked =
                    eligibilityByAgent[agentType]?.canRun === false;

                  return (
                    <AgentRow
                      key={`excluded-${agentType}`}
                      agentType={agentType}
                      action={{
                        isDisabled: isBlocked,
                        onClick: () => includeAgent(agentType),
                        icon: <LuCirclePlus size={16} />,
                      }}
                      tooltip={isBlocked ? null : 'Include agent in auto-run'}
                    />
                  );
                })}
              </PopoverSection>
            </Flex>
          )}
        </Flex>
      ) : null}
    </Flex>
  );

  return (
    <Container $enabled={enabled}>
      <Flex vertical gap={8} className="w-full" flex={1}>
        <Flex justify="space-between" align="center" gap={10}>
          <Text className={enabled ? 'text-primary' : 'text-neutral-secondary'}>
            {enabled ? 'On' : 'Off'}
          </Text>
          <Popover
            content={popoverContent}
            placement="rightTop"
            trigger="click"
            styles={{ body: { padding: 0 } }}
          >
            <Button style={{ padding: '0 8px' }}>
              <LuRefreshCcw />
            </Button>
          </Popover>
        </Flex>
      </Flex>
    </Container>
  );
};
