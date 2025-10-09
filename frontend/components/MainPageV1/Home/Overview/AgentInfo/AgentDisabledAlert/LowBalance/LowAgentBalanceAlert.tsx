import { Button, Typography } from 'antd';

import { CustomAlert } from '@/components/Alert';
import { Pages } from '@/enums';
import { useAgentFundingRequests, usePageState } from '@/hooks';

const { Text } = Typography;

export const LowAgentBalanceAlert = () => {
  const { isAgentBalanceLow, agentTokenRequirementsFormatted } =
    useAgentFundingRequests();
  const { goto } = usePageState();

  if (!isAgentBalanceLow) return null;

  return (
    <CustomAlert
      showIcon
      className="mt-16"
      type="error"
      message={
        <>
          <Text className="text-sm">
            <span className="font-weight-600">Low Agent Wallet Balance</span>
            <br />
            Fund your agent with at least{' '}
            <span className="font-weight-600">
              {agentTokenRequirementsFormatted}
            </span>{' '}
            to keep running your agent. It&apos;s needed for the agent to
            perform on-chain activity and meet staking requirements.
          </Text>
          <br />
          <Button
            onClick={() => goto(Pages.AgentWallet)}
            size="small"
            className="mt-8"
          >
            Fund Agent
          </Button>
        </>
      }
    />
  );
};
