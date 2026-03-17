import { Button, Flex, Typography } from 'antd';

import { Alert } from '@/components/ui';
import { CHAIN_CONFIG } from '@/config/chains';
import { PAGES } from '@/constants';
import { useMasterBalances, usePageState, useServices } from '@/hooks';

const { Text } = Typography;

export const MasterEoaLowBalanceAlert = () => {
  const { goto } = usePageState();
  const { selectedAgentConfig } = useServices();
  const { isMasterEoaLowOnGas, masterEoaGasRequirement } = useMasterBalances();

  const homeChainId = selectedAgentConfig.evmHomeChainId;
  const { nativeToken } = CHAIN_CONFIG[homeChainId];

  if (!isMasterEoaLowOnGas) return null;

  return (
    <Alert
      showIcon
      className="mt-16"
      type="error"
      message={
        <Flex vertical gap={10} align="start">
          <Flex vertical gap={4}>
            <Text className="text-sm font-weight-500">Funds Needed</Text>
            <Text className="text-sm">
              Pearl requires funds to cover on-chain transaction fees and
              participate in OLAS staking. Any existing funds cannot be used for
              this purpose.
            </Text>
            <Text className="text-sm">
              Please fund your Pearl Wallet with{' '}
              {`${masterEoaGasRequirement} ${nativeToken.symbol} `}.
            </Text>
          </Flex>

          <Button onClick={() => goto(PAGES.FundPearlWallet)} size="small">
            Fund Pearl Wallet
          </Button>
        </Flex>
      }
    />
  );
};
