import { SettingOutlined } from '@ant-design/icons';
import { Flex, Typography } from 'antd';
import Image from 'next/image';
import { useMemo } from 'react';
import { TbWallet } from 'react-icons/tb';
import styled from 'styled-components';

import {
  CardFlex,
  InfoTooltip,
  Tooltip,
  useContentTransitionValue,
} from '@/components/ui';
import { COLOR, PAGES } from '@/constants';
import { useAutoRunContext } from '@/context/AutoRunProvider';
import {
  useAgentPerformance,
  usePageState,
  useService,
  useServices,
} from '@/hooks';
import { sanitizeHtml } from '@/utils';

import {
  AboutAgent,
  AgentInfoAlerts,
  AutoRunAlert,
  ChainLogo,
  IconButton,
} from '../AgentInfo';
import { AgentRunButton } from '../AgentInfo/AgentRunButton';
import {
  MetricsCapturedTimestampAlert,
  MetricsUnavailableAlert,
  NoMetricsAlert,
} from '../Performance';
import { StakingAlert, useCanManageStaking } from '../Staking/Staking';
import { Streak } from '../Staking/Streak';

const { Title, Text } = Typography;

const HEADER_METRICS_COUNT = 2;

const SidePanel = styled(Flex)`
  width: 260px;
  flex: none;
  padding: 12px;
  border-radius: 12px;
  background: ${COLOR.GRAY_1};
`;

const AlertSlot = styled.div`
  &:not(:empty) {
    margin-top: 16px;
  }
`;

const HeaderMetrics = () => {
  const { data: agentPerformance } = useAgentPerformance();
  const { selectedAgentConfig } = useServices();

  const metrics = useMemo(
    () =>
      [...(agentPerformance?.metrics ?? [])]
        .sort((a, b) => Number(b.is_primary) - Number(a.is_primary))
        .slice(0, HEADER_METRICS_COUNT),
    [agentPerformance?.metrics],
  );

  if (selectedAgentConfig.arePerformanceMetricsUnavailable) return null;

  return (
    <Flex vertical gap={8}>
      {metrics.map(({ name, value, description }) => (
        <Flex key={name} justify="space-between" align="center" gap={8}>
          <Text className="text-sm text-neutral-tertiary">{name}:</Text>
          <Flex align="center" gap={6}>
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
            <Text strong className="text-sm">
              {value}
            </Text>
          </Flex>
        </Flex>
      ))}
    </Flex>
  );
};

/** Why metrics are missing or stale: unavailable, none yet, or captured while stopped. */
const PerformanceAlert = () => {
  const { selectedService, selectedAgentConfig } = useServices();
  const { isServiceActive } = useService(selectedService?.service_config_id);
  const { data: agentPerformance, isLoading } = useAgentPerformance();

  if (selectedAgentConfig.arePerformanceMetricsUnavailable) {
    return <MetricsUnavailableAlert />;
  }
  if (isLoading) return null;
  if (!agentPerformance?.metrics?.length) return <NoMetricsAlert />;
  if (!isServiceActive && agentPerformance.timestamp) {
    return (
      <MetricsCapturedTimestampAlert timestamp={agentPerformance.timestamp} />
    );
  }
  return null;
};

/**
 * Compact agent header: name, run button, wallet and streak shortcuts, the
 * agent's two key metrics, and the Overview's banners at the bottom.
 */
export const AgentChatHeader = () => {
  const { goto } = usePageState();
  const {
    selectedAgentType,
    selectedAgentConfig,
    selectedAgentNameOrFallback,
  } = useServices();
  const { enabled: isAutoRunEnabled } = useAutoRunContext();
  const canManageStaking = useCanManageStaking();

  const displayedAgentType = useContentTransitionValue(selectedAgentType);
  const displayedAgentName = useContentTransitionValue(
    selectedAgentNameOrFallback,
  );
  const hasSettings =
    !selectedAgentConfig.isX402Enabled && selectedAgentConfig.requiresSetup;

  return (
    <CardFlex $noBorder>
      <Flex align="center" gap={24}>
        <Image
          key={displayedAgentType}
          src={`/agent-${displayedAgentType}-icon.png`}
          width={112}
          height={112}
          alt={displayedAgentType}
          className="rounded-12"
        />
        <Flex vertical align="flex-start" gap={16} className="flex-auto">
          <Flex align="center" gap={12}>
            <Title level={5} className="m-0">
              {displayedAgentName}
            </Title>
            <ChainLogo />
          </Flex>
          {isAutoRunEnabled ? <AutoRunAlert /> : <AgentRunButton />}
        </Flex>
        <SidePanel vertical gap={12}>
          <Flex gap={8} align="center">
            <AboutAgent />
            {hasSettings && (
              <Tooltip title="Agent settings">
                <IconButton
                  align="center"
                  justify="center"
                  onClick={() => goto(PAGES.UpdateAgentTemplate)}
                >
                  <SettingOutlined style={{ fontSize: 20 }} />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Agent Wallet">
              <IconButton
                align="center"
                justify="center"
                role="button"
                aria-label="Agent Wallet"
                onClick={() => goto(PAGES.AgentWallet)}
              >
                <TbWallet fontSize={20} />
              </IconButton>
            </Tooltip>
            <IconButton
              align="center"
              justify="center"
              role="button"
              aria-label="Manage Staking"
              aria-disabled={!canManageStaking}
              onClick={() => canManageStaking && goto(PAGES.AgentStaking)}
            >
              <Streak isCompact />
            </IconButton>
          </Flex>
          <HeaderMetrics />
        </SidePanel>
      </Flex>
      <AgentInfoAlerts />
      <AlertSlot>
        <StakingAlert />
      </AlertSlot>
      <AlertSlot>
        <PerformanceAlert />
      </AlertSlot>
    </CardFlex>
  );
};
