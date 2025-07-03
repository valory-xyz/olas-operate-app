import { Button, Flex, Typography } from 'antd';

import { CustomAlert } from '@/components/Alert';
import { AgentType } from '@/enums/Agent';
import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';

const { Text } = Typography;

export const UnderConstruction = ({ moreInfo = false }) => {
  const { selectedAgentType } = useServices();
  const { goto } = usePageState();

  if (!(selectedAgentType === AgentType.Memeooorr)) return null;

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
            {moreInfo && <span>You can withdraw agent funds at any time.</span>}
          </div>
          {!!moreInfo && (
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
