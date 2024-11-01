// import { RightOutlined } from '@ant-design/icons';
import { Flex, Skeleton, Typography } from 'antd';
import { useMemo } from 'react';
import styled from 'styled-components';

import { UNICODE_SYMBOLS } from '@/constants/symbols';
// import { Pages } from '@/enums/PageState';
import { useBalance } from '@/hooks/useBalance';
// import { usePageState } from '@/hooks/usePageState';
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
  const { isBalanceLoaded, totalOlasBalance } = useBalance();
  // const { goto } = usePageState();

  const balance = useMemo(() => {
    if (totalOlasBalance === undefined) return '--';
    return balanceFormat(totalOlasBalance, 2);
  }, [totalOlasBalance]);

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
            <Balance className="balance">{balance}</Balance>
            <span className="balance-currency">OLAS</span>
          </Flex>

          {/* <Text
            type="secondary"
            className="text-sm pointer hover-underline"
            onClick={() => goto(Pages.YourWalletBreakdown)}
          >
            See breakdown
            <RightOutlined style={{ fontSize: 12, paddingLeft: 6 }} />
          </Text> */}
        </Flex>
      ) : (
        <Skeleton.Input active size="large" style={{ margin: '4px 0' }} />
      )}
    </CardSection>
  );
};
