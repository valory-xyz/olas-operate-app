import {
  Button,
  Divider,
  Flex,
  Popover,
  Switch,
  Tooltip,
  Typography,
} from 'antd';
import { useMemo } from 'react';
import { LuCircleMinus, LuCirclePlus, LuRefreshCcw } from 'react-icons/lu';
import styled from 'styled-components';

import { AgentGroup, AgentTreeInstance } from '@/components/ui/AgentTree';
import { ACTIVE_AGENTS } from '@/config/agents';
import { AgentType, COLOR } from '@/constants';
import { useAutoRunContext } from '@/context/AutoRunProvider';
import { useAgentRunning, useService, useServices } from '@/hooks';
import { Service } from '@/types';
import { getServiceInstanceName, isServiceOfAgent } from '@/utils';

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

/** Group of instances belonging to the same agent type, for auto-run display. */
type AutoRunGroup = {
  agentType: AgentType;
  instances: AgentTreeInstance[];
};

/** Build groups from a list of serviceConfigIds + services. */
const buildGroups = (
  serviceConfigIds: string[],
  services: Service[] | undefined,
): AutoRunGroup[] => {
  if (!services) return [];
  const groupMap = new Map<AgentType, AutoRunGroup>();

  for (const id of serviceConfigIds) {
    const service = services.find((s) => s.service_config_id === id);
    if (!service) continue;

    const agentEntry = ACTIVE_AGENTS.find(([, config]) =>
      isServiceOfAgent(service, config),
    );
    if (!agentEntry) continue;

    const [agentType, config] = agentEntry;
    if (!groupMap.has(agentType)) {
      groupMap.set(agentType, { agentType, instances: [] });
    }
    groupMap.get(agentType)!.instances.push({
      serviceConfigId: id,
      name: getServiceInstanceName(
        service,
        config.displayName,
        config.evmHomeChainId,
      ),
    });
  }

  return Array.from(groupMap.values());
};

export const AutoRunControl = () => {
  const {
    enabled,
    includedInstances,
    excludedInstances,
    eligibilityByInstance,
    isToggling,
    setEnabled,
    includeInstance,
    excludeInstance,
  } = useAutoRunContext();
  const { runningServiceConfigId } = useAgentRunning();
  const { services, selectedService } = useServices();
  const { isServiceTransitioning } = useService(
    selectedService?.service_config_id,
  );

  const includedIds = useMemo(
    () => includedInstances.map((inst) => inst.serviceConfigId),
    [includedInstances],
  );

  const includedGroups = useMemo(
    () => buildGroups(includedIds, services),
    [includedIds, services],
  );

  const excludedGroups = useMemo(
    () => buildGroups(excludedInstances, services),
    [excludedInstances, services],
  );

  const popoverContent = (
    <Flex vertical style={{ width: 280 }}>
      <PopoverSection vertical gap={8}>
        <Flex align="center" justify="space-between">
          <Text strong>Auto-run</Text>
          <Switch
            checked={enabled}
            onChange={setEnabled}
            loading={isToggling || isServiceTransitioning}
            size="small"
          />
        </Flex>
        <Text
          className="text-neutral-tertiary text-sm flex"
          style={{ width: 200 }}
        >
          Runs agents one after another, automatically.
        </Text>
      </PopoverSection>

      {enabled && (
        <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <PopoverSection>
            <Flex vertical gap={8} className="w-full">
              {includedGroups.length === 0 ? (
                <Text type="secondary">No agents enabled.</Text>
              ) : (
                includedGroups.map((group) => (
                  <AgentGroup
                    key={group.agentType}
                    agentType={group.agentType}
                    instances={group.instances}
                    renderInstanceTrailing={(serviceConfigId) => {
                      const isRunning =
                        serviceConfigId === runningServiceConfigId;
                      const isLastIncluded = includedIds.length <= 1;
                      const tooltip = (() => {
                        if (isRunning)
                          return "Can't exclude: agent is currently running";
                        if (isLastIncluded)
                          return "Can't exclude the last enabled agent";
                        return 'Exclude from auto-run';
                      })();
                      return (
                        <Tooltip title={tooltip} placement="right">
                          <Button
                            size="small"
                            type="text"
                            danger
                            disabled={isRunning || isLastIncluded}
                            onClick={() => excludeInstance(serviceConfigId)}
                            icon={<LuCircleMinus size={16} />}
                          />
                        </Tooltip>
                      );
                    }}
                  />
                ))
              )}
            </Flex>
          </PopoverSection>

          {excludedGroups.length > 0 && (
            <>
              <PopoverSection>
                <Text className="text-sm text-neutral-tertiary">
                  Excluded from auto-run
                </Text>
              </PopoverSection>
              <Divider className="m-0" />
              <PopoverSection>
                <Flex vertical gap={8} className="w-full">
                  {excludedGroups.map((group) => (
                    <AgentGroup
                      key={group.agentType}
                      agentType={group.agentType}
                      instances={group.instances}
                      renderInstanceTrailing={(serviceConfigId) => {
                        const isBlocked =
                          eligibilityByInstance[serviceConfigId]?.canRun ===
                          false;
                        return (
                          <Tooltip
                            title={isBlocked ? null : 'Include in auto-run'}
                            placement="right"
                          >
                            <Button
                              size="small"
                              type="text"
                              disabled={isBlocked}
                              onClick={() => includeInstance(serviceConfigId)}
                              icon={<LuCirclePlus size={16} />}
                            />
                          </Tooltip>
                        );
                      }}
                    />
                  ))}
                </Flex>
              </PopoverSection>
            </>
          )}
        </div>
      )}
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
