import { Button, Flex, Popover, Tag, Typography } from 'antd';
import { useMemo } from 'react';
import { TbMinus, TbPlus } from 'react-icons/tb';
import styled from 'styled-components';

import { Segmented } from '@/components/ui';
import { AGENT_CONFIG } from '@/config/agents';
import { AgentType, COLOR } from '@/constants';
import { useAutoRun } from '@/hooks';

const { Text } = Typography;

const AutoRunHeader = styled(Flex)`
  border: 1px solid ${COLOR.GRAY_4};
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 16px;
`;

const AgentRow = ({
  agentType,
  action,
  reason,
}: {
  agentType: AgentType;
  action?: {
    icon: JSX.Element;
    onClick: () => void;
    ariaLabel: string;
  };
  reason?: string;
}) => {
  const name = AGENT_CONFIG[agentType]?.displayName ?? agentType;

  return (
    <Flex justify="space-between" align="center" className="w-full">
      <Flex vertical gap={4}>
        <Text>{name}</Text>
        {reason && (
          <Text type="secondary" className="text-xs">
            {reason}
          </Text>
        )}
      </Flex>
      {action ? (
        <Button
          size="small"
          type="text"
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
    setEnabled,
    includeAgent,
    excludeAgent,
  } = useAutoRun();

  const includedAgentTypes = useMemo(
    () => includedAgents.map((agent) => agent.agentType),
    [includedAgents],
  );

  const toggleValue = enabled ? 'on' : 'off';

  const popoverContent = (
    <Flex vertical gap={12} style={{ minWidth: 240 }}>
      <Flex vertical gap={8}>
        <Text strong>Can run</Text>
        {includedAgentTypes.length === 0 ? (
          <Text type="secondary">No agents included.</Text>
        ) : (
          includedAgentTypes.map((agentType) => {
            const eligibility = eligibilityByAgent[agentType];
            const reason =
              eligibility && !eligibility.canRun
                ? eligibility.reason
                : undefined;
            return (
              <AgentRow
                key={`included-${agentType}`}
                agentType={agentType}
                reason={reason}
                action={{
                  icon: <TbMinus size={16} />,
                  onClick: () => excludeAgent(agentType),
                  ariaLabel: `Exclude ${agentType}`,
                }}
              />
            );
          })
        )}
      </Flex>

      <Flex vertical gap={8}>
        <Text strong>Excluded</Text>
        {excludedAgents.length === 0 ? (
          <Text type="secondary">No agents excluded.</Text>
        ) : (
          excludedAgents.map((agentType) => {
            const eligibility = eligibilityByAgent[agentType];
            const reason =
              eligibility && !eligibility.canRun
                ? eligibility.reason
                : undefined;
            return (
              <AgentRow
                key={`excluded-${agentType}`}
                agentType={agentType}
                reason={reason}
                action={{
                  icon: <TbPlus size={16} />,
                  onClick: () => includeAgent(agentType),
                  ariaLabel: `Include ${agentType}`,
                }}
              />
            );
          })
        )}
      </Flex>
    </Flex>
  );

  return (
    <AutoRunHeader justify="space-between" align="center" gap={8}>
      <Flex vertical gap={8} className="w-full">
        <Flex justify="space-between" align="center">
          <Text strong>Auto-run</Text>
          {enabled && (
            <Tag color="green" bordered={false}>
              On
            </Tag>
          )}
        </Flex>
        <Flex justify="space-between" align="center" gap={8}>
          <Segmented<'on' | 'off'>
            value={toggleValue}
            onChange={(value) => setEnabled(value === 'on')}
            options={[
              { value: 'on', label: 'On' },
              { value: 'off', label: 'Off' },
            ]}
            size="small"
          />
          <Popover
            content={popoverContent}
            placement="bottomRight"
            trigger="click"
          >
            <Button size="small" type="default">
              Agents
            </Button>
          </Popover>
        </Flex>
      </Flex>
    </AutoRunHeader>
  );
};
