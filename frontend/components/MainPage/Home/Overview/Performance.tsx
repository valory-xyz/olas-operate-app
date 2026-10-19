import { Button, Col, Flex, Row, Spin, Typography } from 'antd';
import { useMemo } from 'react';
import styled from 'styled-components';

import { Alert, CardFlex, InfoTooltip, Tooltip } from '@/components/ui';
import { COLOR } from '@/constants';
import { useService, useServices } from '@/hooks';
import { useAgentPerformance } from '@/hooks/useAgentPerformance';
import { Optional } from '@/types/Util';
import { getTimeAgo, sanitizeHtml } from '@/utils';

const { Text, Title } = Typography;

export const NoMetricsAlert = () => (
  <Alert
    message="Additional performance metrics appear with the first measurable result."
    type="info"
    centered
    showIcon
    className="text-sm"
  />
);

export const MetricsUnavailableAlert = () => (
  <Alert
    message="Performance metrics aren't available in this app version"
    type="info"
    centered
    showIcon
    className="text-sm"
  />
);

type RequiresProfileOpenAlertProps = {
  title: string;
  message: string;
};
const RequiresProfileOpenAlert = ({
  title,
  message,
}: RequiresProfileOpenAlertProps) => (
  <Alert
    message={
      <Text className="text-sm">
        <div className="font-weight-500 mb-4">{title}</div>
        {message}
      </Text>
    }
    type="warning"
    showIcon
    className="text-sm"
  />
);

export const MetricsCapturedTimestampAlert = ({
  timestamp,
}: {
  timestamp: number;
}) => (
  <Alert
    message={`Data captured ${getTimeAgo(timestamp)}.`}
    type="info"
    centered
    showIcon
    closable
    className="text-sm"
  />
);

const AgentBehaviorContainer = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  background-color: ${COLOR.GRAY_1};
  border-radius: 10px;
`;

type PerformanceProps = {
  openProfile: () => void;
  hasVisitedProfile?: boolean;
};

type AgentMetricProps = {
  name: string;
  value: string | number;
  description: Optional<string>;
};

const AgentMetric = ({ name, value, description }: AgentMetricProps) => (
  <Flex vertical gap={8}>
    <Flex align="center" gap={8}>
      <Text className="text-neutral-secondary">{name}</Text>
      {description && (
        <InfoTooltip
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
    </Flex>
    <Text className="text-xl">{value}</Text>
  </Flex>
);

/**
 * To display agent performance on the main page.
 */
export const Performance = ({
  openProfile,
  hasVisitedProfile = false,
}: PerformanceProps) => {
  const { data: agentPerformance, isLoading } = useAgentPerformance();
  const { selectedService, selectedAgentConfig } = useServices();
  const { isServiceActive } = useService(selectedService?.service_config_id);

  const sortedMetrics = useMemo(() => {
    if (!agentPerformance?.metrics) return [];
    // Put primary metric first
    return agentPerformance.metrics.sort((metric) =>
      metric.is_primary ? -1 : 1,
    );
  }, [agentPerformance?.metrics]);

  const agentBehavior =
    agentPerformance?.agent_behavior || selectedAgentConfig.defaultBehavior;

  const shouldShowOpenProfileAlert =
    isServiceActive &&
    !hasVisitedProfile &&
    selectedAgentConfig.needsOpenProfileEachAgentRun;

  return (
    <Flex vertical>
      <Title level={5} className="mt-0 mb-12">
        Performance
      </Title>

      <CardFlex $noBorder>
        <Flex vertical gap={24}>
          {selectedAgentConfig.arePerformanceMetricsUnavailable ? (
            <MetricsUnavailableAlert />
          ) : isLoading ? (
            <Flex justify="center" className="mt-24">
              <Spin />
            </Flex>
          ) : shouldShowOpenProfileAlert ? (
            <RequiresProfileOpenAlert
              title={
                selectedAgentConfig.needsOpenProfileEachAgentRunAlert.title
              }
              message={
                selectedAgentConfig.needsOpenProfileEachAgentRunAlert.message
              }
            />
          ) : sortedMetrics.length === 0 ? (
            <NoMetricsAlert />
          ) : (
            <>
              {!isServiceActive && agentPerformance?.timestamp && (
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
              <Tooltip title={agentBehavior} styles={{ body: { width: 400 } }}>
                <AgentBehaviorContainer>
                  <Text ellipsis title={agentBehavior}>
                    {agentBehavior}
                  </Text>
                  {isServiceActive ? (
                    <Button size="small" onClick={openProfile}>
                      {selectedAgentConfig.needsOpenProfileEachAgentRun
                        ? 'Connect'
                        : 'Update'}
                    </Button>
                  ) : (
                    !selectedAgentConfig.needsOpenProfileEachAgentRun && (
                      <Button size="small" disabled>
                        Start Agent to Update
                      </Button>
                    )
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
