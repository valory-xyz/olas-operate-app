import { RightOutlined } from '@ant-design/icons';
import { Flex, Skeleton, Typography } from 'antd';
import { sum } from 'lodash';
import { useMemo } from 'react';
import styled from 'styled-components';

import { UNICODE_SYMBOLS } from '@/constants/symbols';
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
import { balanceFormat } from '@/utils/numberFormatters';

import { CardSection } from '../../styled/CardSection';

const { Text } = Typography;

const Balance = styled.span`
  letter-spacing: -2px;
  margin-right: 4px;
`;

type MainOlasBalanceProps = { isBorderTopVisible?: boolean };

export const MainOlasBalance = ({
  isBorderTopVisible = true,
}: MainOlasBalanceProps) => {
  const { selectedService } = useServices();
  const { isLoaded: isBalanceLoaded } = useBalanceContext();
  const { masterWalletBalances } = useMasterBalances();
  const { serviceStakedBalances, serviceWalletBalances } = useServiceBalances(
    selectedService?.service_config_id,
  );
  const { goto } = usePageState();
  const isBalanceBreakdownEnabled = useFeatureFlag('balance-breakdown');

  const displayedBalance = useMemo(() => {
    // olas across master wallets, safes and eoa
    const masterWalletOlasBalance = masterWalletBalances?.reduce(
      (acc, { symbol, balance }) => {
        if (symbol === TokenSymbol.OLAS) {
          return acc + Number(balance);
        }
        return acc;
      },
      0,
    );

    // olas across all service wallets
    const serviceWalletOlasBalance = serviceWalletBalances?.reduce(
      (acc, { symbol, balance }) => {
        if (symbol === TokenSymbol.OLAS) {
          return acc + Number(balance);
        }
        return acc;
      },
      0,
    );

    // olas staked across all services
    const serviceStakedOlasBalance = serviceStakedBalances?.reduce(
      (acc, { olasBondBalance, olasDepositBalance }) => {
        return acc + Number(olasBondBalance) + Number(olasDepositBalance);
      },
      0,
    );

    const totalOlasBalance = sum([
      masterWalletOlasBalance,
      serviceWalletOlasBalance,
      serviceStakedOlasBalance,
    ]);

    return balanceFormat(totalOlasBalance, 2);
  }, [masterWalletBalances, serviceStakedBalances, serviceWalletBalances]);

  return (
    <CardSection
      vertical
      gap={8}
      bordertop={isBorderTopVisible ? 'true' : 'false'}
      borderbottom="true"
      padding="16px 24px"
    >
      {isBalanceLoaded ? (
        <Flex vertical gap={8}>
          <Text type="secondary">Current balance</Text>
          <Flex align="end">
            <span className="balance-symbol">{UNICODE_SYMBOLS.OLAS}</span>
            <Balance className="balance">{displayedBalance}</Balance>
            <span className="balance-currency">OLAS</span>
          </Flex>

          {isBalanceBreakdownEnabled && (
            <Text
              type="secondary"
              className="text-sm pointer hover-underline"
              onClick={() => goto(Pages.YourWalletBreakdown)}
            >
              See breakdown
              <RightOutlined style={{ fontSize: 12, paddingLeft: 6 }} />
            </Text>
          )}
        </Flex>
      ) : (
        <Skeleton.Input active size="large" style={{ margin: '4px 0' }} />
      )}
    </CardSection>
  );
};
