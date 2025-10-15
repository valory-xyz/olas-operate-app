import { Button, Flex, Statistic, Typography } from 'antd';
import { useMemo } from 'react';

import { CustomAlert } from '@/components/Alert';
import { AgentLowBalanceAlert } from '@/components/MainPageV1/Home/Overview/AgentInfo/AgentDisabledAlert/LowBalance/AgentLowBalanceAlert';
import { BackButton, CardFlex } from '@/components/ui';
import { COLOR } from '@/constants';
import { Pages } from '@/enums/Pages';
import { useActiveStakingContractDetails, usePageState } from '@/hooks';

const { Text, Title } = Typography;
const { Timer } = Statistic;

const AgentWalletTitle = () => {
  const { goto } = usePageState();
  return (
    <Flex vertical justify="space-between" gap={12}>
      <BackButton onPrev={() => goto(Pages.Main)} />
      <Title level={3} className="m-0">
        Agent Wallet
      </Title>
    </Flex>
  );
};

const EvictedAgentAlert = ({ expiresAt }: { expiresAt: number }) => {
  return (
    <CustomAlert
      message={
        <Text className="text-sm">
          <span className="font-weight-600">
            Withdrawals Temporarily Unavailable
          </span>{' '}
          <br />
          Your agent hasn&apos;t reached the minimum duration of staking.
          You&apos;ll be able to withdraw in{' '}
          <Timer
            type="countdown"
            value={expiresAt * 1000}
            format="HH [hours] mm [minutes] ss [seconds]"
            valueStyle={{
              fontSize: 14,
              color: COLOR.TEXT_COLOR.WARNING.DEFAULT,
            }}
          />
        </Text>
      }
      type="warning"
      showIcon
      centered
      className="mt-16 text-sm"
    />
  );
};

type AgentWalletOperationProps = {
  onWithdraw: () => void;
  onFundAgent: () => void;
};

export const AgentWalletOperation = ({
  onWithdraw,
  onFundAgent,
}: AgentWalletOperationProps) => {
  const { isAgentEvicted, isEligibleForStaking, evictionExpiresAt } =
    useActiveStakingContractDetails();

  const isWithdrawDisabled = isAgentEvicted && !isEligibleForStaking;

  const withdrawDisabledAlert = useMemo(() => {
    if (isWithdrawDisabled)
      return <EvictedAgentAlert expiresAt={evictionExpiresAt} />;
    return null;
  }, [isWithdrawDisabled, evictionExpiresAt]);

  return (
    <CardFlex $noBorder>
      <Flex justify="space-between" align="end">
        <AgentWalletTitle />
        <Flex gap={8}>
          <Button disabled={isWithdrawDisabled} onClick={onWithdraw}>
            Withdraw
          </Button>
          <Button type="primary" onClick={onFundAgent}>
            Fund Agent
          </Button>
        </Flex>
      </Flex>
      {withdrawDisabledAlert}
      <AgentLowBalanceAlert onFund={onFundAgent} needInitialValues />
    </CardFlex>
  );
};
