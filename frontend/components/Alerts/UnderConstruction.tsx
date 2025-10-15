import { Button, Flex, Typography } from 'antd';

import { CustomAlert } from '@/components/Alert';
import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';
import { useSharedContext } from '@/hooks/useSharedContext';

const { Text } = Typography;

export const UnderConstruction = ({ showMoreInfo = false }) => {
  const { selectedAgentConfig } = useServices();
  const { goto } = usePageState();
  const { mainOlasBalance } = useSharedContext();

  const hasExternalFunds = selectedAgentConfig.hasExternalFunds;

  if (!selectedAgentConfig.isUnderConstruction) return null;

  return (
    <CustomAlert
      type="warning"
      fullWidth
      showIcon
      message={
        <Flex justify="space-between" gap={4} vertical>
          <Text className="font-weight-600">Agent is under construction</Text>
          <div className="text-sm">
            The agent is temporarily unavailable due to technical issues for an
            unspecified time.{' '}
            {showMoreInfo &&
              (hasExternalFunds
                ? 'You can withdraw agent funds at any time'
                : 'You can start your agent to withdraw its funds at any time.')}
            {showMoreInfo && (mainOlasBalance !== 0 || hasExternalFunds) && (
              <div className="w-fit">
                <Button
                  onClick={() => goto(Pages.ManageWallet)}
                  size="small"
                  className="text-sm mt-8"
                >
                  Withdraw
                </Button>
              </div>
            )}
          </div>
        </Flex>
      }
    />
  );
};
