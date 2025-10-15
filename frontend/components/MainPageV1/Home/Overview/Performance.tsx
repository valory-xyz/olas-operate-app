import { useQuery } from '@tanstack/react-query';
import { Button, Col, Flex, Row, Spin, Typography } from 'antd';
import { isNil } from 'lodash';
import { useMemo } from 'react';
import styled from 'styled-components';

import { CustomAlert } from '@/components/Alert';
import { InfoTooltip } from '@/components/InfoTooltip';
import { CardFlex, Tooltip } from '@/components/ui';
import {
  COLOR,
  FIVE_MINUTE_INTERVAL,
  MiddlewareDeploymentStatusMap,
  REACT_QUERY_KEYS,
} from '@/constants';
import { useServices } from '@/hooks';
import { ServicesService } from '@/service/Services';
import { Optional } from '@/types/Util';
import { asEvmChainId, getTimeAgo, sanitizeHtml } from '@/utils';

const { Text, Title } = Typography;

const NoMetricsAlert = () => (
  <CustomAlert
    message="Additional performance metrics appear with the first measurable result."
    type="info"
    centered
    showIcon
    className="text-sm"
  />
);

const MetricsCapturedTimestampAlert = ({
  timestamp,
}: {
  timestamp: number;
}) => (
  <CustomAlert
    message={`Data captured ${getTimeAgo(timestamp)}. Start the agent to see real-time performance.`}
    type="info"
    centered
    showIcon
    closable
    className="text-sm"
  />
);

const AGENT_BEHAVIOR_TEXT =
  'Conservative volatile exposure across DEXs and lending markets with advanced functionality enabled.';

const AgentBehaviorContainer = styled.div`
  display: flex;
  gap: 12px;
  padding: 16px;
  background-color: ${COLOR.GRAY_1};
  border-radius: 10px;
`;

/**
 * Hook to get the agent performance data
 */
export const useAgentPerformance = () => {
  const { selectedService } = useServices();
  const chainId = selectedService?.home_chain;
  const serviceConfigId = selectedService?.service_config_id;

  return useQuery({
    queryKey: REACT_QUERY_KEYS.AGENT_PERFORMANCE_KEY(
      chainId ? asEvmChainId(chainId) : -1,
      serviceConfigId!,
    ),
    queryFn: async () => {
      if (!serviceConfigId) return null;

      return await ServicesService.getAgentPerformance({
        serviceConfigId,
      });
    },
    enabled: !isNil(chainId) && !isNil(serviceConfigId),
    refetchInterval: FIVE_MINUTE_INTERVAL,
  });
};

type PerformanceProps = {
  openProfile: () => void;
};

type AgentMetricProps = {
  name: string;
  value: string | number;
  description: Optional<string>;
};

const AgentMetric = ({ name, value, description }: AgentMetricProps) => (
  <Flex vertical gap={8}>
    <Text className="text-neutral-secondary">
      {name}
      {description && (
        <InfoTooltip
          className="ml-8"
          styles={{ body: { maxWidth: 360, width: 'max-content' } }}
          placement="top"
        >
          <span
            dangerouslySetInnerHTML={{
              __html: sanitizeHtml(description),
            }}
          />
        </InfoTooltip>
      )}
    </Text>
    <Text className="text-xl">{value}</Text>
  </Flex>
);

/**
 * To display agent performance on the main page.
 */
export const Performance = ({ openProfile }: PerformanceProps) => {
  const { data: agentPerformance, isLoading } = useAgentPerformance();
  const { selectedService, selectedAgentConfig } = useServices();

  const selectedServiceStatus = selectedService?.deploymentStatus;
  const isAgentRunning =
    selectedServiceStatus === MiddlewareDeploymentStatusMap.DEPLOYED;

  const sortedMetrics = useMemo(() => {
    if (!agentPerformance?.metrics) return [];
    // Put primary metric first
    return agentPerformance.metrics.sort((metric) =>
      metric.is_primary ? -1 : 1,
    );
  }, [agentPerformance?.metrics]);

  const agentBehavior =
    agentPerformance?.agent_behavior || selectedAgentConfig.defaultBehavior;

  return (
    <Flex vertical>
      <Title level={5} className="mt-0 mb-12">
        Performance
      </Title>

      <CardFlex $noBorder>
        <Flex vertical gap={24}>
          {isLoading ? (
            <Flex justify="center" className="mt-24">
              <Spin />
            </Flex>
          ) : sortedMetrics.length === 0 ? (
            <NoMetricsAlert />
          ) : (
            <>
              {!isAgentRunning && agentPerformance?.timestamp && (
                <MetricsCapturedTimestampAlert
                  timestamp={agentPerformance.timestamp}
                />
              )}
              <Row gutter={[16, 16]}>
                {sortedMetrics.map((metric) => (
                  <Col span={12} key={metric.name}>
                    <AgentMetric
                      name={metric.name}
                      value={metric.value}
                      description={metric.description}
                    />
                  </Col>
                ))}
              </Row>
            </>
          )}
          {agentBehavior && (
            <Flex flex={1} vertical gap={8}>
              <Text className="text-neutral-secondary">Agent behavior</Text>
              <Tooltip
                title={AGENT_BEHAVIOR_TEXT}
                styles={{ body: { width: 400 } }}
              >
                <AgentBehaviorContainer>
                  <Text ellipsis title={agentBehavior}>
                    {agentBehavior}
                  </Text>
                  {isAgentRunning ? (
                    <Button size="small" onClick={openProfile}>
                      Update
                    </Button>
                  ) : (
                    <Button size="small" disabled>
                      Start Agent to Update
                    </Button>
                  )}
                </AgentBehaviorContainer>
              </Tooltip>
            </Flex>
          )}
        </Flex>
      </CardFlex>
    </Flex>
  );
};
