import { Flex, Typography } from 'antd';
import { isEmpty } from 'lodash';

import { CustomAlert } from '@/components/Alert';
import { useBalanceAndRefillRequirementsContext } from '@/hooks';
import {
  asEvmChainDetails,
  asMiddlewareChain,
  formatTokenAmounts,
} from '@/utils';

import { usePearlWallet } from '../../PearlWalletProvider';

const { Text } = Typography;

export const LowPearlWalletBalanceAlert = () => {
  const { walletChainId, defaultRequirementDepositValues } = usePearlWallet();
  const { isRefillRequired } = useBalanceAndRefillRequirementsContext();

  if (!isRefillRequired) return null;

  if (!walletChainId || isEmpty(defaultRequirementDepositValues)) return null;

  return (
    <CustomAlert
      type="error"
      showIcon
      message={
        <Flex vertical gap={4}>
          <Text className="text-sm font-weight-500">
            Low Pearl Wallet Balance on{' '}
            {asEvmChainDetails(asMiddlewareChain(walletChainId)).displayName}{' '}
            Chain
          </Text>
          <Text className="text-sm">
            To continue using Pearl without interruption, deposit{' '}
            {formatTokenAmounts(defaultRequirementDepositValues)} on your Pearl
            Wallet.
          </Text>
        </Flex>
      }
      className="mt-24"
    />
  );
};
