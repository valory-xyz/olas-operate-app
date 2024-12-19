import { Button, Flex, Typography } from 'antd';
import { useMemo } from 'react';

import { CustomAlert } from '@/components/Alert';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useServices } from '@/hooks/useServices';
import { useStore } from '@/hooks/useStore';

const { Text, Title } = Typography;

export const AvoidSuspensionAlert = () => {
  const { store } = useElectronApi();
  const { storeState } = useStore();
  const { selectedAgentType } = useServices();

  // If first reward notification is shown BUT
  // agent eviction alert is NOT yet shown, show this alert.
  const showAvoidSuspensionAlert = useMemo(() => {
    if (!storeState) return false;

    const agentType = storeState[selectedAgentType];
    return (
      agentType?.firstRewardNotificationShown &&
      !agentType?.agentEvictionAlertShown
    );
  }, [storeState, selectedAgentType]);

  if (!showAvoidSuspensionAlert) return null;

  return (
    <CustomAlert
      fullWidth
      type="info"
      showIcon
      message={
        <Flex vertical gap={8} align="flex-start">
          <Title level={5} style={{ margin: 0 }}>
            Avoid suspension!
          </Title>
          <Text>
            Run your agent for at least half an hour a day to avoid missing
            targets. If it misses its targets 2 days in a row, it&apos;ll be
            suspended. You won&apos;t be able to run it or earn rewards for
            several days.
          </Text>
          <Button
            type="primary"
            ghost
            onClick={() =>
              store?.set?.(`${selectedAgentType}.agentEvictionAlertShown`, true)
            }
            style={{ marginTop: 4 }}
          >
            Understood
          </Button>
        </Flex>
      }
    />
  );
};
