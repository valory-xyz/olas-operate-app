import { useQuery } from '@tanstack/react-query';
import { Button, Col, Flex, Row, Spin, Typography } from 'antd';
import { isNil } from 'lodash';
import { useMemo } from 'react';
import styled from 'styled-components';

import { CustomAlert } from '@/components/Alert';
import { CardFlex } from '@/components/ui/CardFlex';
import {
  COLOR,
  FIVE_MINUTE_INTERVAL,
  MiddlewareDeploymentStatusMap,
  REACT_QUERY_KEYS,
} from '@/constants';
import { useServices } from '@/hooks';
import { ServicesService } from '@/service/Services';
import { asEvmChainId, getTimeAgo } from '@/utils';

const { Text, Title } = Typography;

const NoMetricsAlert = () => (
  <CustomAlert
    message="Additional performance metrics appear with the first measurable result."
    type="info"
    centered
    showIcon
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
  />
);

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
      asEvmChainId(chainId),
      serviceConfigId!,
    ),
    queryFn: async () => {
      if (!serviceConfigId) return null;

      const agentPerformance = await ServicesService.getAgentPerformance({
        serviceConfigId,
      });

      return agentPerformance;
    },
    enabled: !isNil(chainId) && !isNil(serviceConfigId),
    refetchInterval: FIVE_MINUTE_INTERVAL,
  });
};

type PerformanceProps = {
  openProfile: () => void;
};

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

  const agentBehavior = useMemo(() => {
    return (
      agentPerformance?.agent_behavior || selectedAgentConfig.defaultBehavior
    );
  }, [agentPerformance?.agent_behavior, selectedAgentConfig.defaultBehavior]);

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
                    <Flex vertical gap={8}>
                      <Text className="text-neutral-secondary">
                        {metric.name}
                      </Text>
                      <Text className="text-xl">{metric.value}</Text>
                    </Flex>
                  </Col>
                ))}
              </Row>
            </>
          )}
          <Flex flex={1} vertical gap={8}>
            <Text className="text-neutral-secondary">Agent behavior</Text>
            {agentBehavior && (
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
            )}
          </Flex>
        </Flex>
      </CardFlex>
    </Flex>
  );
};
