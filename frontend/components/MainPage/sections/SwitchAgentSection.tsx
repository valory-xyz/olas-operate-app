// TODO: remove this file
import { Flex, Typography } from 'antd';
import Image from 'next/image';

import { CardSection } from '@/components/ui/CardSection';
import { useServices } from '@/hooks/useServices';

const { Text } = Typography;

export const SwitchAgentSection = () => {
  const {
    // isLoading: isServicesLoading,
    selectedAgentConfig,
    selectedAgentType,
    // selectedService,
  } = useServices();
  // const { isServiceRunning } = useService(selectedService?.service_config_id);
  // const { isAllStakingContractDetailsRecordLoaded } =
  //   useStakingContractContext();

  // enable only if all conditions are met
  // const isSwitchAgentEnabled = useMemo(() => {
  //   if (isServicesLoading) return false;
  //   if (isServiceRunning) return false;
  //   if (!isAllStakingContractDetailsRecordLoaded) return false;
  //   return true;
  // }, [
  //   isServicesLoading,
  //   isServiceRunning,
  //   isAllStakingContractDetailsRecordLoaded,
  // ]);

  return (
    <CardSection
      gap={8}
      $padding="8px 24px"
      justify="space-between"
      align="center"
      $borderBottom
    >
      <Flex gap={12} align="center">
        <Image
          src={`/agent-${selectedAgentType}-icon.png`}
          width={32}
          height={32}
          alt={selectedAgentConfig.displayName}
        />
        <Text>{selectedAgentConfig.displayName}</Text>
      </Flex>

      {/* {isSwitchAgentEnabled ? (
        <Button
          onClick={() => goto(Pages.SwitchAgent)}
          size="small"
          className="text-sm"
        >
          Switch agent
        </Button>
      ) : (
        <Popover
          placement="bottomRight"
          content="To switch, stop the agent you're running"
          showArrow={false}
        >
          <Button disabled size="small" className="text-sm">
            Switch agent
          </Button>
        </Popover>
      )} */}
    </CardSection>
  );
};
