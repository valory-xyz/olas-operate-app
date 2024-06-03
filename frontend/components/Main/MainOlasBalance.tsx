import { InfoCircleOutlined } from '@ant-design/icons';
import { Flex, Skeleton, Tooltip, Typography } from 'antd';
import { useMemo } from 'react';
import styled from 'styled-components';

import { balanceFormat } from '@/common-util/numberFormatters';
import { COLOR } from '@/constants';
import { UNICODE_SYMBOLS } from '@/constants/unicode';
import { useBalance } from '@/hooks';
import { useReward } from '@/hooks/useReward';

import { CardSection } from '../styled/CardSection';

const { Text } = Typography;
const Balance = styled.span`
  letter-spacing: -2px;
  margin-right: 4px;
`;
const BalanceBreakdown = styled.div`
  padding: 4px;
`;
const BalanceBreakdownLine = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  color: ${COLOR.TEXT};

  > span {
    background: ${COLOR.WHITE};
    z-index: 1;
    &:first-child {
      padding-right: 6px;
    }
    &:last-child {
      padding-left: 6px;
    }
  }

  &:before {
    content: '';
    position: absolute;
    bottom: 6px;
    width: 100%;
    border-bottom: 2px dotted ${COLOR.BORDER_GRAY};
  }

  &:not(:last-child) {
    margin-bottom: 8px;
  }
`;
const OVERLAY_STYLE = { maxWidth: '300px', width: '300px' };

const CurrentBalance = () => {
  const { totalOlasBalance, totalOlasStakedBalance } = useBalance();
  const { accruedServiceStakingRewards } = useReward();

  const balances = useMemo(() => {
    return [
      {
        title: 'Staked amount',
        value: balanceFormat(totalOlasStakedBalance ?? 0, 2),
      },
      {
        title: 'Unclaimed rewards',
        value: balanceFormat(accruedServiceStakingRewards ?? 0, 2),
      },
      {
        title: 'Unused funds',
        value: balanceFormat(
          (totalOlasBalance ?? 0) - (totalOlasStakedBalance ?? 0),
          2,
        ),
      },
    ];
  }, [accruedServiceStakingRewards, totalOlasBalance, totalOlasStakedBalance]);

  return (
    <Text type="secondary">
      Current balance&nbsp;
      <Tooltip
        arrow={false}
        placement="bottom"
        overlayStyle={OVERLAY_STYLE}
        title={
          <BalanceBreakdown>
            {balances.map((item, index) => (
              <BalanceBreakdownLine key={index}>
                <span>{item.title}</span>
                <span className="font-weight-600">{item.value} OLAS</span>
              </BalanceBreakdownLine>
            ))}
          </BalanceBreakdown>
        }
      >
        <InfoCircleOutlined />
      </Tooltip>
    </Text>
  );
};

export const MainOlasBalance = () => {
  const { isBalanceLoaded, totalOlasBalance } = useBalance();

  const balance = useMemo(() => {
    if (totalOlasBalance === undefined) return '--';
    return balanceFormat(totalOlasBalance, 2);
  }, [totalOlasBalance]);

  return (
    <CardSection vertical gap={8} bordertop="true" borderbottom="true">
      {isBalanceLoaded ? (
        <>
          <CurrentBalance />
          <Flex align="end">
            <span className="balance-symbol">{UNICODE_SYMBOLS.OLAS}</span>
            <Balance className="balance">{balance}</Balance>
            <span className="balance-currency">OLAS</span>
          </Flex>
        </>
      ) : (
        <Skeleton.Input active size="large" style={{ margin: '4px 0' }} />
      )}
    </CardSection>
  );
};
