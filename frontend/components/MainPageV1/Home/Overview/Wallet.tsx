import { Button, Flex, Typography } from 'antd';
import { isNumber } from 'lodash';
import { useMemo } from 'react';

import { CustomAlert } from '@/components/Alert';
import { CardFlex } from '@/components/ui/CardFlex';
import { NA, UNICODE_SYMBOLS } from '@/constants/symbols';
import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';

const { Text, Title } = Typography;

const LowPearlWalletBalance = () => (
  <CustomAlert
    showIcon
    type="error"
    message={
      <>
        <Text className="text-sm font-weight-500">
          Low Pearl Wallet Balance
        </Text>
        <Text className="text-sm flex mt-4 mb-8">
          To continue using Pearl without interruption, deposit on your Pearl
          Wallet the amounts below.
        </Text>
        <Flex vertical gap={4} className="mb-8">
          <Text>{UNICODE_SYMBOLS.BULLET} 2.5 XDAI · Gnosis</Text>
          <Text>{UNICODE_SYMBOLS.BULLET} 0.0005 ETH · Optimism</Text>
          <Text>{UNICODE_SYMBOLS.BULLET} 0.0005 ETH · Mode</Text>
        </Flex>

        {/* TODO */}
        <Button size="small" disabled>
          Deposit
        </Button>
      </>
    }
  />
);

const showAlert = false;

/**
 * To display current epoch lifetime, streak, and relevant alerts.
 */
export const Wallet = () => {
  const { goto } = usePageState();
  // const { currentEpochLifetime } = useStakingDetails();
  const aggregatedBalanceInUsdTODO = null;

  // TODO
  const alert = useMemo(() => {
    if (showAlert) return <LowPearlWalletBalance />;
    return null;
  }, []);

  return (
    <Flex vertical>
      <Flex justify="space-between" align="center">
        <Title level={4}>Wallet</Title>
        <Button size="small" onClick={() => goto(Pages.AgentWallet)}>
          Manage Wallet
        </Button>
      </Flex>

      <CardFlex $noBorder>
        <Flex vertical gap={24}>
          {alert}
          <Flex flex={1}>
            <Flex flex={1} vertical gap={4}>
              <Text className="text-neutral-tertiary">Aggregated balance</Text>
              <Flex align="center" gap={8}>
                {isNumber(aggregatedBalanceInUsdTODO)
                  ? `$${aggregatedBalanceInUsdTODO}`
                  : NA}
              </Flex>
            </Flex>
            <Flex flex={1} vertical gap={4}>
              <Text className="text-neutral-tertiary">Tokens</Text>
              {NA}
            </Flex>
          </Flex>
        </Flex>
      </CardFlex>
    </Flex>
  );
};
