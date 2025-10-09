import { ArrowUpOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { Skeleton, Tooltip, Typography } from 'antd';
import { isNil } from 'lodash';
import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';

import { COLOR } from '@/constants/colors';
import { EXPLORER_URL_BY_MIDDLEWARE_CHAIN } from '@/constants/urls';
import {
  useBalanceContext,
  useMasterBalances,
} from '@/hooks/useBalanceContext';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useServices } from '@/hooks/useServices';
import { useStore } from '@/hooks/useStore';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { asMiddlewareChain } from '@/utils/middlewareHelpers';

import { CardSection } from '../../ui/CardSection';

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
  const { isLoaded: isBalanceLoaded } = useBalanceContext();
  const { isFetched: isServicesLoaded, selectedAgentType } = useServices();

  const { storeState } = useStore();
  const { showNotification } = useElectronApi();

  const { isMasterSafeLowOnNativeGas } = useMasterBalances();

  const [isLowBalanceNotificationShown, setIsLowBalanceNotificationShown] =
    useState(false);

  /**
   * If the master safe is low on native gas and the service safe balance is below the threshold,
   */
  const isLowFunds = useMemo(() => {
    if (isNil(isMasterSafeLowOnNativeGas)) return false;

    return isMasterSafeLowOnNativeGas;
  }, [isMasterSafeLowOnNativeGas]);

  // show notification if balance is too low
  useEffect(() => {
    if (!isBalanceLoaded || !isServicesLoaded) return;
    if (!showNotification) return;
    if (!storeState?.[selectedAgentType]?.isInitialFunded) return;

    if (isLowFunds && !isLowBalanceNotificationShown) {
      showNotification('Operating balance is too low.');
      setIsLowBalanceNotificationShown(true);
    }

    // If it has already been shown and the balance has increased,
    // should show the notification again if it goes below the threshold.
    if (!isLowFunds && isLowBalanceNotificationShown) {
      setIsLowBalanceNotificationShown(false);
    }
  }, [
    isBalanceLoaded,
    isLowBalanceNotificationShown,
    isLowFunds,
    isServicesLoaded,
    selectedAgentType,
    showNotification,
    storeState,
  ]);

  const status = useMemo(() => {
    if (!isBalanceLoaded || !isServicesLoaded) {
      return { statusName: 'Loading...', StatusComponent: EmptyDot };
    }

    if (isLowFunds) {
      return { statusName: 'Too low', StatusComponent: EmptyDot };
    }

    return { statusName: 'Fine', StatusComponent: FineDot };
  }, [isBalanceLoaded, isLowFunds, isServicesLoaded]);

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
  const { selectedAgentConfig } = useServices();
  const { evmHomeChainId: homeChainId } = selectedAgentConfig;
  const { masterSafes } = useMasterWalletContext();
  const { isLoaded: isBalancesLoaded } = useBalanceContext();

  const masterSafe = useMemo(() => {
    if (isNil(masterSafes)) return;

    return masterSafes.find((wallet) => wallet.evmChainId === homeChainId);
  }, [homeChainId, masterSafes]);

  const activityLink = useMemo(() => {
    if (!masterSafe) return;

    const link =
      EXPLORER_URL_BY_MIDDLEWARE_CHAIN[asMiddlewareChain(homeChainId)] +
      '/address/' +
      masterSafe.address;

    return (
      <a href={link} target="_blank">
        Track activity on blockchain explorer{' '}
        <ArrowUpOutlined style={{ rotate: '45deg' }} />
      </a>
    );
  }, [masterSafe, homeChainId]);

  return (
    <CardSection
      justify="space-between"
      bordertop="true"
      borderbottom="true"
      padding="16px 24px"
    >
      <Text type="secondary">
        Operating balance&nbsp;
        {masterSafe && (
          <Tooltip
            title={
              <TooltipContent>
                Your agent uses this balance to fund on-chain activity.
                <br />
                {activityLink}
              </TooltipContent>
            }
          >
            <InfoCircleOutlined />
          </Tooltip>
        )}
      </Text>

      {isBalancesLoaded ? (
        <Text strong>
          <BalanceStatus />
        </Text>
      ) : (
        <Skeleton.Button active size="small" style={{ width: 96 }} />
      )}
    </CardSection>
  );
};
