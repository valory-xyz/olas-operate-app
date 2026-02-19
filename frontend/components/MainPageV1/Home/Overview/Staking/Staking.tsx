import { Button, Flex, Typography } from 'antd';
import { useMemo } from 'react';

import { Alert, CardFlex } from '@/components/ui';
import { PAGES } from '@/constants';
import {
  useActiveStakingContractDetails,
  useAgentActivity,
  usePageState,
  useServices,
} from '@/hooks';
import { isValidServiceId } from '@/utils';

import { EpochClock } from './EpochClock';
import { Streak } from './Streak';

const { Text, Title } = Typography;

const UnderConstructionAlert = () => (
  <Alert
    message="The agent is under construction and cannot participate in staking until further notice."
    type="warning"
    centered
    showIcon
    className="text-sm"
  />
);

const EvictionAlert = () => (
  <Alert
    message="The agent is evicted and cannot participate in staking until the eviction period ends."
    type="warning"
    centered
    showIcon
    className="text-sm"
  />
);

const RunAgentAlert = () => (
  <Alert
    message="Start the agent to join staking and unlock protocol rewards."
    type="info"
    centered
    showIcon
    className="text-sm"
  />
);

/**
 * To display current epoch lifetime, streak, and relevant alerts.
 */
export const Staking = () => {
  const { goto } = usePageState();
  const { isAgentEvicted, isEligibleForStaking } =
    useActiveStakingContractDetails();
  const { isServiceRunning } = useAgentActivity();
  const { selectedService, selectedAgentConfig } = useServices();

  const { isUnderConstruction } = selectedAgentConfig;

  const hasValidServiceToken = useMemo(() => {
    if (!selectedService) return false;
    const token =
      selectedService?.chain_configs?.[selectedService?.home_chain]?.chain_data
        ?.token;
    return isValidServiceId(token);
  }, [selectedService]);

  const alert = useMemo(() => {
    if (isUnderConstruction) return <UnderConstructionAlert />;
    if (isAgentEvicted && !isEligibleForStaking) return <EvictionAlert />;
    if (!isServiceRunning) return <RunAgentAlert />;
    return null;
  }, [
    isAgentEvicted,
    isEligibleForStaking,
    isServiceRunning,
    isUnderConstruction,
  ]);

  return (
    <Flex vertical gap={12}>
      <Flex justify="space-between" align="center">
        <Title level={5} className="m-0">
          Staking
        </Title>
        {!isUnderConstruction && hasValidServiceToken && (
          <Button size="small" onClick={() => goto(PAGES.AgentStaking)}>
            Manage Staking
          </Button>
        )}
      </Flex>

      <CardFlex $noBorder>
        <Flex vertical gap={24}>
          {alert}
          <Flex flex={1}>
            <Flex flex={1} vertical gap={8}>
              <Text className="text-neutral-secondary">Epoch lifetime</Text>
              <EpochClock />
            </Flex>
            <Flex flex={1} vertical gap={8}>
              <Text className="text-neutral-secondary">Streak</Text>
              <Streak />
            </Flex>
          </Flex>
        </Flex>
      </CardFlex>
    </Flex>
  );
};
