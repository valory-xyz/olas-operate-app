import { Button, Flex, Typography } from 'antd';
import { isNumber } from 'lodash';

import { CardFlex } from '@/components/ui/CardFlex';
import { NA } from '@/constants/symbols';
import { Pages } from '@/enums/Pages';
import { useSharedContext } from '@/hooks';
import { usePageState } from '@/hooks/usePageState';

const { Text, Title } = Typography;

// TODO
/**
 * To display wallet overview on the main page.
 */
export const Wallet = () => {
  const { isMainOlasBalanceLoading } = useSharedContext();
  const { goto } = usePageState();
  const aggregatedBalanceInUsdTODO = null;

  return (
    <Flex vertical>
      <Flex justify="space-between" align="center">
        <Title level={4}>Wallet</Title>
        <Button
          disabled={isMainOlasBalanceLoading}
          onClick={() => goto(Pages.AgentWallet)}
          size="small"
        >
          Manage Wallet
        </Button>
      </Flex>

      <CardFlex $noBorder>
        <Flex vertical gap={24}>
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
