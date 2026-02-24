import {
  Button,
  Divider,
  Flex,
  Image,
  Popover,
  Switch,
  Typography,
} from 'antd';
import { ReactNode, useMemo } from 'react';
import { LuCircleMinus, LuCirclePlus, LuRefreshCcw } from 'react-icons/lu';
import styled from 'styled-components';

import { AGENT_CONFIG } from '@/config/agents';
import { AgentType, COLOR } from '@/constants';
import { useAutoRunContext } from '@/context/AutoRunProvider';
import { useAgentRunning } from '@/hooks';

const { Text } = Typography;

const Container = styled(Flex)<{ $enabled: boolean }>`
  background-color: ${({ $enabled }) =>
    $enabled ? COLOR.PURPLE_LIGHT_3 : COLOR.GRAY_4};
  border-radius: 10px;
  padding: 4px 4px 4px 10px;
`;

const PopoverSection = styled(Flex)`
  padding: 12px 16px;
`;

type AgentRowProps = {
  agentType: AgentType;
  action?: {
    icon: ReactNode;
    onClick: () => void;
    ariaLabel: string;
    isDanger?: boolean;
    isDisabled?: boolean;
  };
};
const AgentRow = ({ agentType, action }: AgentRowProps) => {
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
      {action ? (
        <Button
          size="small"
          type="text"
          danger={action.isDanger}
          disabled={action.isDisabled}
          aria-label={action.ariaLabel}
          onClick={action.onClick}
          icon={action.icon}
        />
      ) : null}
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
            disabled={isToggling}
            loading={isToggling}
            size="small"
          />
        </Flex>
        <Text
          className="text-neutral-tertiary text-sm flex"
          style={{ width: 200 }}
        >
          Enables Pearl to run your agents sequentially.
        </Text>
      </PopoverSection>

      {enabled ? (
        <PopoverSection vertical gap={12}>
          <Flex vertical gap={8}>
            {includedAgentTypes.length === 0 ? (
              <Text type="secondary">No agents enabled.</Text>
            ) : (
              includedAgentTypes.map((agentType) => {
                const isRunning = agentType === runningAgentType;
                const action = isRunning
                  ? undefined
                  : {
                      icon: <LuCircleMinus size={16} />,
                      onClick: () => excludeAgent(agentType),
                      ariaLabel: `Exclude ${agentType}`,
                      isDanger: true,
                    };

                return (
                  <AgentRow
                    key={`included-${agentType}`}
                    agentType={agentType}
                    action={action}
                  />
                );
              })
            )}
          </Flex>

          {excludedAgents.length === 0 ? null : (
            <Flex vertical gap={8}>
              <Text strong>Excluded from auto-run</Text>
              <Divider className="m-0" />
              {excludedAgents.map((agentType) => {
                const isBlocked =
                  eligibilityByAgent[agentType]?.canRun === false;

                return (
                  <AgentRow
                    key={`excluded-${agentType}`}
                    agentType={agentType}
                    action={{
                      icon: <LuCirclePlus size={16} />,
                      onClick: () => includeAgent(agentType),
                      ariaLabel: `Include ${agentType}`,
                      isDisabled: isBlocked,
                    }}
                  />
                );
              })}
            </Flex>
          )}
        </PopoverSection>
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
