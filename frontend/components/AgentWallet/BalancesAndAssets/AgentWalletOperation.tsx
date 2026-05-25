import { Button, Flex, Typography } from 'antd';

import { AgentLowBalanceAlert } from '@/components/AgentLowBalanceAlert';
import { BackButton, CardFlex, Tooltip } from '@/components/ui';
import { PAGES } from '@/constants';
import {
  useActiveStakingContractDetails,
  useAgentFundingRequests,
  useFeatureFlag,
  usePageState,
  useService,
  useServices,
} from '@/hooks';

import { useAgentWallet } from '../AgentWalletProvider';
import { AgentWalletOverflowMenu } from './AgentWalletOverflowMenu';

const { Title } = Typography;

const AgentWalletTitle = () => {
  const { goto } = usePageState();
  return (
    <Flex vertical justify="space-between" gap={12}>
      <BackButton onPrev={() => goto(PAGES.Main)} />
      <Title level={3} className="m-0">
        Agent Wallet
      </Title>
    </Flex>
  );
};

type AgentWalletOperationProps = {
  onWithdraw: () => void;
  onFundAgent: () => void;
  onDecommission: () => void;
};

export const AgentWalletOperation = ({
  onWithdraw,
  onFundAgent,
  onDecommission,
}: AgentWalletOperationProps) => {
  const isWithdrawFeatureEnabled = useFeatureFlag('withdraw-funds');
  const { agentTokenRequirements } = useAgentFundingRequests();
  const { setFundInitialValues } = useAgentWallet();
  const { selectedService } = useServices();
  const { service, serviceEoa } = useService(
    selectedService?.service_config_id,
  );
  const { isServiceStakedForMinimumDuration, selectedStakingContractDetails } =
    useActiveStakingContractDetails();

  const isWithdrawDisabled = !isWithdrawFeatureEnabled || !service;

  return (
    <CardFlex $noBorder>
      <Flex justify="space-between" align="end">
        <AgentWalletTitle />
        <Flex gap={8} align="center">
          <AgentWalletOverflowMenu
            onDecommission={onDecommission}
            isServiceStakedForMinimumDuration={
              isServiceStakedForMinimumDuration
            }
            selectedStakingContractDetails={selectedStakingContractDetails}
          />
          {isWithdrawFeatureEnabled ? (
            <Button disabled={isWithdrawDisabled} onClick={onWithdraw}>
              Withdraw
            </Button>
          ) : (
            <Tooltip title="Available soon!">
              <Button disabled>Withdraw</Button>
            </Tooltip>
          )}

          <Tooltip title={serviceEoa ? null : 'Run agent to enable'}>
            <Button type="primary" onClick={onFundAgent} disabled={!serviceEoa}>
              Fund Agent
            </Button>
          </Tooltip>
        </Flex>
      </Flex>

      <AgentLowBalanceAlert
        onFund={() => {
          if (agentTokenRequirements) {
            setFundInitialValues(agentTokenRequirements);
          }
          onFundAgent();
        }}
      />
    </CardFlex>
  );
};
