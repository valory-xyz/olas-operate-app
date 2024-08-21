import { ArrowUpOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { Skeleton, Tooltip, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';

import { COLOR } from '@/constants/colors';
import { useBalance } from '@/hooks/useBalance';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useStore } from '@/hooks/useStore';
import { useWallet } from '@/hooks/useWallet';

import { CardSection } from '../../styled/CardSection';

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

const BalanceStatus = () => {
  const { isBalanceLoaded, isLowBalance } = useBalance();
  const { storeState } = useStore();
  const { showNotification } = useElectronApi();

  const [isLowBalanceNotificationShown, setIsLowBalanceNotificationShown] =
    useState(false);

  // show notification if balance is too low
  useEffect(() => {
    if (!isBalanceLoaded) return;
    if (!showNotification) return;
    if (!storeState?.isInitialFunded) return;

    if (isLowBalance && !isLowBalanceNotificationShown) {
      showNotification('Trading balance is too low.');
      setIsLowBalanceNotificationShown(true);
    }

    // If it has already been shown and the balance has increased,
    // should show the notification again if it goes below the threshold.
    if (!isLowBalance && isLowBalanceNotificationShown) {
      setIsLowBalanceNotificationShown(false);
    }
  }, [
    isBalanceLoaded,
    isLowBalanceNotificationShown,
    isLowBalance,
    showNotification,
    storeState?.isInitialFunded,
  ]);

  const status = useMemo(() => {
    if (isLowBalance) {
      return { statusName: 'Too low', StatusComponent: EmptyDot };
    }

    return { statusName: 'Fine', StatusComponent: FineDot };
  }, [isLowBalance]);

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

export const GasBalanceSection = () => {
  const { masterSafeAddress } = useWallet();
  const { isBalanceLoaded } = useBalance();

  return (
    <CardSection
      justify="space-between"
      bordertop="true"
      borderbottom="true"
      padding="16px 24px"
    >
      <Text type="secondary">
        Trading balance&nbsp;
        {masterSafeAddress && (
          <Tooltip
            title={
              <TooltipContent>
                Your agent uses this balance to fund trading activity on-chain.
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
