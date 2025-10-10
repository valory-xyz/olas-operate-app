import { Flex, Typography } from 'antd';
import { isEmpty } from 'lodash';

import { CustomAlert } from '@/components/Alert';
import { getNativeTokenSymbol } from '@/config/tokens';
import { UNICODE_SYMBOLS } from '@/constants';
import {
  useBalanceAndRefillRequirementsContext,
  useMasterWalletContext,
} from '@/hooks';
import { tokenBalancesToSentence } from '@/utils';

import { usePearlWallet } from '../../PearlWalletProvider';
import { WalletChain } from '../../types';
import { getAddressBalance, getInitialDepositValues } from '../../utils';

const { Text } = Typography;

export const LowPearlWalletBalanceAlert = () => {
  const { defaultRequirementDepositValues, chains } = usePearlWallet();
  const { isRefillRequired, getRefillRequirementsOf } =
    useBalanceAndRefillRequirementsContext();
  const { getMasterSafeOf } = useMasterWalletContext();

  if (!isRefillRequired || !getRefillRequirementsOf) return null;

  if (isEmpty(defaultRequirementDepositValues)) return null;

  return (
    <CustomAlert
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
              const masterSafe = getMasterSafeOf?.(chain.chainId)?.address;
              if (!masterSafe) return null;

              // Get the native token symbol for the selected wallet chain
              const nativeTokenSymbol = getNativeTokenSymbol(chain.chainId);
              if (!nativeTokenSymbol) return;

              // Get the refill requirements for the selected wallet chain
              const refillRequirements = getRefillRequirementsOf(chain.chainId);

              if (!refillRequirements) return;

              const masterSafeRefillRequirement = getAddressBalance(
                refillRequirements,
                masterSafe,
              );

              const fundsRequired = getInitialDepositValues(
                chain.chainId,
                masterSafeRefillRequirement!,
                nativeTokenSymbol,
              );

              if (isEmpty(fundsRequired)) return null;

              return (
                <Flex key={chain.chainId} gap={6}>
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
