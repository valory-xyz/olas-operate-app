import { Button, Typography } from 'antd';

import { Alert } from '@/components/ui';
import {
  useAgentFundingRequests,
  useServices,
  useStakingProgram,
} from '@/hooks';
import { isNoStakingProgram, isStakingAvailable } from '@/utils/stakingProgram';

const { Text } = Typography;

type AgentLowBalanceAlertProps = {
  onFund: () => void;
};

export const AgentLowBalanceAlert = ({ onFund }: AgentLowBalanceAlertProps) => {
  const { isAgentBalanceLow, agentTokenRequirementsFormatted } =
    useAgentFundingRequests();
  const { selectedAgentConfig } = useServices();
  const { selectedStakingProgramId } = useStakingProgram();
  // Staking requirements apply only to an agent that can stake here and is
  // staked: an unstaked Connect has none.
  const hasStakingRequirements =
    isStakingAvailable(
      selectedAgentConfig,
      selectedAgentConfig.evmHomeChainId,
    ) && !isNoStakingProgram(selectedStakingProgramId);

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
            perform on-chain activity
            {hasStakingRequirements ? ' and meet staking requirements' : ''}.
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
