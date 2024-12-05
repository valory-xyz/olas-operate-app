import { Button, Flex, Typography } from 'antd';
import Image from 'next/image';
import { useMemo } from 'react';

import { CardSection } from '@/components/styled/CardSection';
import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';
import { useService } from '@/hooks/useService';
import { useServices } from '@/hooks/useServices';
import { useStakingContractContext } from '@/hooks/useStakingContractDetails';

const { Text } = Typography;

export const SwitchAgentSection = () => {
  const { goto } = usePageState();
  const {
    isLoading: isServicesLoading,
    selectedAgentConfig,
    selectedAgentType,
    selectedService,
  } = useServices();
  const { isServiceRunning } = useService(selectedService?.service_config_id);
  const { isAllStakingContractDetailsRecordLoaded } =
    useStakingContractContext();

  // enable only if all conditions are met
  const isSwitchAgentEnabled = useMemo(() => {
    if (isServicesLoading) return false;
    if (isServiceRunning) return false;
    if (!isAllStakingContractDetailsRecordLoaded) return false;
    return true;
  }, [
    isServicesLoading,
    isServiceRunning,
    isAllStakingContractDetailsRecordLoaded,
  ]);

  return (
    <CardSection
      gap={8}
      padding="12px 24px"
      justify="space-between"
      align="center"
      borderbottom="true"
    >
      <Flex gap={12} align="center">
        <Image
          src={`/agent-${selectedAgentType}-icon.png`}
          width={24}
          height={24}
          alt={selectedAgentConfig.displayName}
        />
        <Text>{selectedAgentConfig.displayName}</Text>
      </Flex>

      <Button
        disabled={!isSwitchAgentEnabled}
        onClick={() => goto(Pages.SwitchAgent)}
        type="primary"
        ghost
      >
        Switch agent
      </Button>
    </CardSection>
  );
};
