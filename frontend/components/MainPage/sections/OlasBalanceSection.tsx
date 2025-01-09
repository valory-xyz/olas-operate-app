import { Button, Flex, Skeleton, Typography } from 'antd';
import { sum } from 'lodash';
import { useContext, useMemo } from 'react';
import styled from 'styled-components';

import { AnimateNumber } from '@/components/ui/animations/AnimateNumber';
import { UNICODE_SYMBOLS } from '@/constants/symbols';
import { RewardContext } from '@/context/RewardProvider';
import { Pages } from '@/enums/Pages';
import { TokenSymbol } from '@/enums/Token';
import {
  useBalanceContext,
  useMasterBalances,
  useServiceBalances,
} from '@/hooks/useBalanceContext';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';

import { CardSection } from '../../styled/CardSection';

const { Text } = Typography;

const Balance = styled.span`
  letter-spacing: -2px;
  margin-right: 4px;
`;

export const MainOlasBalance = () => {
  const { selectedService, selectedAgentConfig } = useServices();
  const { isLoaded: isBalanceLoaded } = useBalanceContext();
  const { masterWalletBalances } = useMasterBalances();
  const { serviceStakedBalances, serviceWalletBalances } = useServiceBalances(
    selectedService?.service_config_id,
  );
  const { optimisticRewardsEarnedForEpoch, accruedServiceStakingRewards } =
    useContext(RewardContext);

  const { goto } = usePageState();
  const isBalanceBreakdownEnabled = useFeatureFlag('manage-wallet');

  const displayedBalance = useMemo(() => {
    // olas across master wallet (safes and eoa) on relevant chains for agent
    const masterWalletOlasBalance = masterWalletBalances?.reduce(
      (acc, { symbol, balance, evmChainId }) => {
        if (
          symbol === TokenSymbol.OLAS &&
          selectedAgentConfig.requiresAgentSafesOn.includes(evmChainId)
        ) {
          return acc + Number(balance);
        }
        return acc;
      },
      0,
    );

    // olas across all wallets owned by selected service
    const serviceWalletOlasBalance = serviceWalletBalances?.reduce(
      (acc, { symbol, balance, evmChainId }) => {
        if (
          symbol === TokenSymbol.OLAS &&
          selectedAgentConfig.requiresAgentSafesOn.includes(evmChainId)
        ) {
          return acc + Number(balance);
        }
        return acc;
      },
      0,
    );

    // olas staked across services on relevant chains for agent
    const serviceStakedOlasBalance = serviceStakedBalances?.reduce(
      (acc, { olasBondBalance, olasDepositBalance, evmChainId }) => {
        if (!selectedAgentConfig.requiresAgentSafesOn.includes(evmChainId)) {
          return acc;
        }
        return acc + Number(olasBondBalance) + Number(olasDepositBalance);
      },
      0,
    );

    const totalOlasBalance = sum([
      masterWalletOlasBalance,
      serviceWalletOlasBalance,
      serviceStakedOlasBalance,
      optimisticRewardsEarnedForEpoch,
      accruedServiceStakingRewards,
    ]);

    return totalOlasBalance;
  }, [
    accruedServiceStakingRewards,
    masterWalletBalances,
    optimisticRewardsEarnedForEpoch,
    selectedAgentConfig.requiresAgentSafesOn,
    serviceStakedBalances,
    serviceWalletBalances,
  ]);

  return (
    <CardSection
      vertical
      gap={8}
      bordertop="true"
      borderbottom="true"
      padding="16px 24px"
    >
      {isBalanceLoaded ? (
        <Flex vertical gap={8}>
          <Flex align="center" justify="space-between">
            <Text type="secondary">Current balance</Text>
            {isBalanceBreakdownEnabled && (
              <Button
                size="small"
                onClick={() => goto(Pages.ManageWallet)}
                className="text-sm"
              >
                Manage wallet
              </Button>
            )}
          </Flex>

          <Flex align="end">
            <span className="balance-symbol">{UNICODE_SYMBOLS.OLAS}</span>
            <Balance className="balance">
              <AnimateNumber value={displayedBalance} />
            </Balance>
            <span className="balance-currency">OLAS</span>
          </Flex>
        </Flex>
      ) : (
        <Skeleton.Input active size="large" style={{ margin: '4px 0' }} />
      )}
    </CardSection>
  );
};
