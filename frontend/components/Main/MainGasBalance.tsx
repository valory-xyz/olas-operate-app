import { ArrowUpOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { Skeleton, Tooltip, Typography } from 'antd';
import { useMemo } from 'react';
import styled from 'styled-components';

import { COLOR, LOW_BALANCE } from '@/constants';
import { useBalance } from '@/hooks';
import { useWallet } from '@/hooks/useWallet';

import { CardSection } from '../styled/CardSection';

const { Text } = Typography;

const Dot = styled.span`
  position: relative;
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 8px;
  border: 2px solid #ffffff;
  box-shadow:
    rgb(0 0 0 / 7%) 0px 2px 4px 0px,
    rgb(0 0 0 / 3%) 0px 0px 4px 2px;
`;
const EmptyDot = styled(Dot)`
  background-color: ${COLOR.RED};
`;
const FineDot = styled(Dot)`
  background-color: ${COLOR.GREEN_2};
`;
const LowDot = styled(Dot)`
  background-color: ${COLOR.ORANGE};
`;

const BalanceStatus = () => {
  const { totalEthBalance } = useBalance();

  const status = useMemo(() => {
    if (!totalEthBalance || totalEthBalance === 0) {
      return { statusName: 'Empty', StatusComponent: EmptyDot };
    }

    if (totalEthBalance < LOW_BALANCE) {
      return { statusName: 'Low', StatusComponent: LowDot };
    }

    return { statusName: 'Fine', StatusComponent: FineDot };
  }, [totalEthBalance]);

  const { statusName, StatusComponent } = status;
  return (
    <>
      <StatusComponent />
      <Text>{statusName}</Text>
    </>
  );
};

const TooltipContent = styled.div`
  font-size: 77.5%;
  a {
    margin-top: 6px;
    display: inline-block;
  }
`;

export const MainGasBalance = () => {
  const { masterSafeAddress } = useWallet();
  const { isBalanceLoaded } = useBalance();

  return (
    <CardSection justify="space-between" bordertop borderbottom>
      <Text>
        Gas and trading balance&nbsp;
        {masterSafeAddress && (
          <Tooltip
            title={
              <TooltipContent>
                Your agent uses this balance to pay for transactions and other
                trading activity on-chain.
                <br />
                <a
                  href={'https://gnosisscan.io/address/' + masterSafeAddress}
                  target="_blank"
                >
                  Track activity on blockchain explorer{' '}
                  <ArrowUpOutlined style={{ rotate: '45deg' }} />
                </a>
              </TooltipContent>
            }
          >
            <InfoCircleOutlined />
          </Tooltip>
        )}
      </Text>

      {isBalanceLoaded ? (
        <Text strong>
          <BalanceStatus />
        </Text>
      ) : (
        <Skeleton.Button active size="small" style={{ width: 96 }} />
      )}
    </CardSection>
  );
};
