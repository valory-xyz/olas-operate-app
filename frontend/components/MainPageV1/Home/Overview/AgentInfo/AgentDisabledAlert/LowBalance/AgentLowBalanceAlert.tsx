import { Button, Typography } from 'antd';

import { useAgentWallet } from '@/components/AgentWallet/AgentWalletProvider';
import { CustomAlert } from '@/components/Alert';
import { useAgentFundingRequests } from '@/hooks';

const { Text } = Typography;

type AgentLowBalanceAlertProps = {
  onFundClick: () => void;
  needSetInitialValues?: boolean;
};

export const AgentLowBalanceAlert = ({
  onFundClick,
  needSetInitialValues,
}: AgentLowBalanceAlertProps) => {
  const {
    isAgentBalanceLow,
    agentTokenRequirements,
    agentTokenRequirementsFormatted,
  } = useAgentFundingRequests();

  const { setFundInitialValues } = useAgentWallet();

  const handleFundClick = () => {
    if (needSetInitialValues && agentTokenRequirements) {
      setFundInitialValues(agentTokenRequirements);
    }
    onFundClick();
  };

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
          <Button onClick={handleFundClick} size="small" className="mt-8">
            Fund Agent
          </Button>
        </>
      }
    />
  );
};
