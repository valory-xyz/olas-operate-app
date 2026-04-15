import { Button, Typography } from 'antd';

import { Alert } from '@/components/ui';
import { useAgentFundingRequests } from '@/hooks';

const { Text } = Typography;

type AgentLowBalanceAlertProps = {
  onFund: () => void;
};

export const AgentLowBalanceAlert = ({ onFund }: AgentLowBalanceAlertProps) => {
  const { isAgentBalanceLow, agentTokenRequirementsFormatted } =
    useAgentFundingRequests();

  if (!isAgentBalanceLow) return null;

  return (
    <Alert
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
          <Button onClick={onFund} size="small" className="mt-8">
            Fund Agent
          </Button>
        </>
      }
    />
  );
};
