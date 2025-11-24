import { Flex, Typography } from 'antd';
import { entries } from 'lodash';
import Image from 'next/image';

import { TokenSymbol, TokenSymbolConfigMap } from '@/constants';
import { usePearlWallet } from '@/context/PearlWalletProvider';
import { formatNumber } from '@/utils';

const { Text } = Typography;

export const ShowAmountsToDeposit = () => {
  const { amountsToDeposit } = usePearlWallet();

  return (
    <Flex vertical gap={12}>
      {entries(amountsToDeposit)
        .filter(([, { amount }]) => Number(amount) > 0)
        .map(([tokenSymbol, { amount }]) => (
          <Flex key={tokenSymbol} gap={8} align="center">
            <Image
              src={TokenSymbolConfigMap[tokenSymbol as TokenSymbol].image}
              alt={tokenSymbol}
              width={20}
              height={20}
            />
            <Flex gap={8} align="center">
              <Text>
                {formatNumber(amount, 4)} {tokenSymbol}
              </Text>
            </Flex>
          </Flex>
        ))}
    </Flex>
  );
};
