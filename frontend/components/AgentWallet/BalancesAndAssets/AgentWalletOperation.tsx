import { Button, Flex, Typography } from 'antd';
import { useMemo } from 'react';

import { AgentLowBalanceAlert } from '@/components/AgentLowBalanceAlert';
import { Alert, BackButton, CardFlex, Tooltip } from '@/components/ui';
import { PAGES } from '@/constants';
import {
  useActiveStakingContractDetails,
  useFeatureFlag,
  usePageState,
  useService,
  useServices,
  useStakingContractCountdown,
} from '@/hooks';

const { Text, Title } = Typography;

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

type MinimumDurationOfStakingAlertProps = {
  countdown: string;
};
const MinimumDurationOfStakingAlert = ({
  countdown,
}: MinimumDurationOfStakingAlertProps) => (
  <Alert
    message={
      <Text className="text-sm">
        <span className="font-weight-600">
          Withdrawals Temporarily Unavailable
        </span>{' '}
        <br />
        Your agent hasn&apos;t reached the minimum duration of staking.
        You&apos;ll be able to withdraw in {countdown}.
      </Text>
    }
    type="warning"
    showIcon
    className="mt-16 text-sm"
  />
);

type AgentWalletOperationProps = {
  onWithdraw: () => void;
  onFundAgent: () => void;
};

export const AgentWalletOperation = ({
  onWithdraw,
  onFundAgent,
}: AgentWalletOperationProps) => {
  const isWithdrawFeatureEnabled = useFeatureFlag('withdraw-funds');
  const { selectedService } = useServices();
  const { service, serviceEoa } = useService(
    selectedService?.service_config_id,
  );
  const { isServiceStakedForMinimumDuration, selectedStakingContractDetails } =
    useActiveStakingContractDetails();
  const { countdownDisplay } = useStakingContractCountdown(
    selectedStakingContractDetails,
  );

  const isWithdrawDisabled =
    !isWithdrawFeatureEnabled || !service || !isServiceStakedForMinimumDuration;

  const withdrawDisabledAlert = useMemo(() => {
    if (!isWithdrawFeatureEnabled) return null;
    if (!countdownDisplay) return null;
    if (!isServiceStakedForMinimumDuration) {
      return <MinimumDurationOfStakingAlert countdown={countdownDisplay} />;
    }
    return null;
  }, [
    isWithdrawFeatureEnabled,
    countdownDisplay,
    isServiceStakedForMinimumDuration,
  ]);

  return (
    <CardFlex $noBorder>
      <Flex justify="space-between" align="end">
        <AgentWalletTitle />
        <Flex gap={8}>
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

      {withdrawDisabledAlert}
      <AgentLowBalanceAlert onFund={onFundAgent} needInitialValues />
    </CardFlex>
  );
};
