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
            {showMoreInfo && 'You can withdraw agent funds at any time.'}
          </div>
          {showMoreInfo && mainOlasBalance !== 0 && (
            <div className="w-fit">
              <Button
                onClick={() => goto(Pages.ManageWallet)}
                size="small"
                className="text-sm"
              >
                Withdraw
              </Button>
            </div>
          )}
        </Flex>
      }
    />
  );
};
