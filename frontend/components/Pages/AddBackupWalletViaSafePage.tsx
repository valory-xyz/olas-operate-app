import { Card, Flex, Skeleton, Typography } from 'antd';

import { CardTitle } from '@/components/Card/CardTitle';
import { AllEvmChainIdMap, EvmChainIdMap } from '@/constants/chains';
import { UNICODE_SYMBOLS } from '@/constants/symbols';
import { DISCORD_TICKET_URL } from '@/constants/urls';
import { useServices } from '@/hooks/useServices';
import { useMasterWalletContext } from '@/hooks/useWallet';

import { GoToMainPageButton } from './GoToMainPageButton';

const { Text } = Typography;

/**
 * update as needed; check https://app.safe.global/new-safe/create for prefixes
 */
const safeChainPrefix = {
  [AllEvmChainIdMap.Ethereum]: 'eth',
  [EvmChainIdMap.Base]: 'base',
  [EvmChainIdMap.Optimism]: 'oeth',
  [EvmChainIdMap.Gnosis]: 'gno',
  [EvmChainIdMap.Mode]: '', // TODO: provide correct prefix once mode is supported on safe
};

export const AddBackupWalletViaSafePage = () => {
  const { masterSafes } = useMasterWalletContext();
  const {
    selectedAgentConfig: { evmHomeChainId },
  } = useServices();

  const masterSafe = masterSafes?.find(
    ({ evmChainId: chainId }) => evmHomeChainId === chainId,
  );

  const safePrefix =
    masterSafe?.evmChainId && safeChainPrefix[masterSafe.evmChainId];

  return (
    <Card
      title={<CardTitle title="Add backup wallet via Safe" />}
      bordered={false}
      extra={<GoToMainPageButton />}
    >
      <Flex vertical gap={16}>
        <Flex vertical gap={4}>
          <Text>Manually add backup wallet via Safe interface:</Text>
          {masterSafe?.address ? (
            <a
              target="_blank"
              href={`https://app.safe.global/settings/setup?safe=${safePrefix}:${masterSafe.address}`}
            >
              Open Safe interface {UNICODE_SYMBOLS.EXTERNAL_LINK}
            </a>
          ) : (
            <Skeleton.Input style={{ width: 200 }} />
          )}
        </Flex>

        <Flex vertical gap={4}>
          <Text>Not sure how?</Text>
          <a target="_blank" href={DISCORD_TICKET_URL}>
            Get community assistance via Discord ticket{' '}
            {UNICODE_SYMBOLS.EXTERNAL_LINK}
          </a>
        </Flex>
      </Flex>
    </Card>
  );
};
