import { RightOutlined } from '@ant-design/icons';
import { Button, Flex, Skeleton, Typography } from 'antd';
import { useMemo } from 'react';
import styled from 'styled-components';

import { CustomAlert } from '@/components/Alert';
import { UNICODE_SYMBOLS } from '@/constants/symbols';
import { LOW_MASTER_SAFE_BALANCE } from '@/constants/thresholds';
import { Pages } from '@/enums/PageState';
import { useBalance } from '@/hooks/useBalance';
import { useElectronApi } from '@/hooks/useElectronApi';
import { usePageState } from '@/hooks/usePageState';
import { useStore } from '@/hooks/useStore';
import { balanceFormat } from '@/utils/numberFormatters';

import { CardSection } from '../../styled/CardSection';

const { Text, Title } = Typography;
const Balance = styled.span`
  letter-spacing: -2px;
  margin-right: 4px;
`;

const MainOlasBalanceAlert = styled.div`
  .ant-alert {
    margin-bottom: 8px;
    .anticon.ant-alert-icon {
      height: 20px;
      width: 20px;
      svg {
        width: 100%;
        height: 100%;
      }
    }
  }
`;

const LowTradingBalanceAlert = () => {
  const { isBalanceLoaded, isLowBalance } = useBalance();
  const { storeState } = useStore();

  if (!isBalanceLoaded) return null;
  if (!storeState?.isInitialFunded) return;
  if (!isLowBalance) return null;

  return (
    <MainOlasBalanceAlert>
      <CustomAlert
        fullWidth
        type="error"
        showIcon
        message={
          <Flex vertical gap={8} align="flex-start">
            <Title level={5} style={{ margin: 0 }}>
              Trading balance is too low
            </Title>
            <Text>
              {`To run your agent, add at least $${LOW_MASTER_SAFE_BALANCE} XDAI to your account.`}
            </Text>
            <Text>
              Your agent is at risk of missing its targets, which would result
              in several days&apos; suspension.
            </Text>
          </Flex>
        }
      />
    </MainOlasBalanceAlert>
  );
};

const AvoidSuspensionAlert = () => {
  const { store } = useElectronApi();

  return (
    <MainOlasBalanceAlert>
      <CustomAlert
        fullWidth
        type="info"
        showIcon
        message={
          <Flex vertical gap={8} align="flex-start">
            <Title level={5} style={{ margin: 0 }}>
              Avoid suspension!
            </Title>
            <Text>
              Run your agent for at least half an hour a day to avoid missing
              targets. If it misses its targets 2 days in a row, it’ll be
              suspended. You won’t be able to run it or earn rewards for several
              days.
            </Text>
            <Button
              type="primary"
              ghost
              onClick={() => store?.set?.('agentEvictionAlertShown', true)}
              style={{ marginTop: 4 }}
            >
              Understood
            </Button>
          </Flex>
        }
      />
    </MainOlasBalanceAlert>
  );
};

type MainOlasBalanceProps = { isBorderTopVisible?: boolean };
export const MainOlasBalance = ({
  isBorderTopVisible = true,
}: MainOlasBalanceProps) => {
  const { storeState } = useStore();
  const { isBalanceLoaded, totalOlasBalance } = useBalance();
  const { goto } = usePageState();

  // If first reward notification is shown BUT
  // agent eviction alert is NOT yet shown, show this alert.
  const canShowAvoidSuspensionAlert = useMemo(() => {
    if (!storeState) return false;

    return (
      storeState.firstRewardNotificationShown &&
      !storeState.agentEvictionAlertShown
    );
  }, [storeState]);

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
      {canShowAvoidSuspensionAlert ? <AvoidSuspensionAlert /> : null}
      <LowTradingBalanceAlert />

      {isBalanceLoaded ? (
        <Flex vertical gap={8}>
          <Text type="secondary">Current balance</Text>
          <Flex align="end">
            <span className="balance-symbol">{UNICODE_SYMBOLS.OLAS}</span>
            <Balance className="balance">{balance}</Balance>
            <span className="balance-currency">OLAS</span>
          </Flex>

          <Text
            type="secondary"
            className="text-sm pointer hover-underline"
            onClick={() => goto(Pages.YourWalletBreakdown)}
          >
            See breakdown
            <RightOutlined style={{ fontSize: 12, paddingLeft: 6 }} />
          </Text>
        </Flex>
      ) : (
        <Skeleton.Input active size="large" style={{ margin: '4px 0' }} />
      )}
    </CardSection>
  );
};
