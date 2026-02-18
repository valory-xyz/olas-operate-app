import { Flex, Typography } from 'antd';
import { isEmpty } from 'lodash';

import { Alert } from '@/components/ui';
import { UNICODE_SYMBOLS } from '@/constants';
import { usePearlWallet } from '@/context/PearlWalletProvider';
import {
  useBalanceAndRefillRequirementsContext,
  useMasterWalletContext,
  useServices,
} from '@/hooks';
import { tokenBalancesToSentence } from '@/utils';

import { WalletChain } from '../../types';
import { getInitialDepositForMasterSafe } from '../../utils';

const { Text } = Typography;

export const LowPearlWalletBalanceAlert = () => {
  const { chains } = usePearlWallet();
  const { isPearlWalletRefillRequired, getRefillRequirementsOf } =
    useBalanceAndRefillRequirementsContext();
  const { getMasterSafeOf } = useMasterWalletContext();
  const { getServiceConfigIdsOf } = useServices();

  if (!isPearlWalletRefillRequired) return null;

  return (
    <Alert
      type="error"
      showIcon
      message={
        <Flex vertical gap={4}>
          <Text className="text-sm font-weight-500">
            Low Pearl Wallet Balance
          </Text>
          <Text className="text-sm">
            To continue using Pearl without interruption, deposit the amounts
            below into your Pearl Wallet.
          </Text>
          <Flex vertical gap={2} className="ml-8">
            {chains.map((chain: WalletChain) => {
              const chainId = chain.chainId;
              const masterSafe = getMasterSafeOf?.(chainId)?.address;
              if (!masterSafe) return null;

              const serviceConfigIds = getServiceConfigIdsOf(chainId);
              const fundsRequired = getInitialDepositForMasterSafe(
                chainId,
                masterSafe,
                serviceConfigIds,
                getRefillRequirementsOf,
              );
              if (isEmpty(fundsRequired)) return null;

              return (
                <Flex key={chainId} gap={6}>
                  <Text className="text-sm">{UNICODE_SYMBOLS.BULLET}</Text>
                  <Text className="text-sm">
                    {tokenBalancesToSentence(fundsRequired)}
                  </Text>
                  <Text className="text-sm">
                    {UNICODE_SYMBOLS.SMALL_BULLET}
                  </Text>
                  <Text className="text-sm">{chain.chainName}</Text>
                </Flex>
              );
            })}
          </Flex>
        </Flex>
      }
      className="mt-24"
    />
  );
};
