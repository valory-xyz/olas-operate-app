import { Button, Card, Flex, Spin, Typography } from 'antd';
import { kebabCase } from 'lodash';
import Image from 'next/image';
import React from 'react';

import { InfoBreakdownList } from '@/components/InfoBreakdown';
import { TOKEN_CONFIG } from '@/config/tokens';
import { MiddlewareChain } from '@/constants/chains';
import { NA } from '@/constants/symbols';
import { TokenSymbol, TokenSymbolMap } from '@/constants/token';
import { useBalanceContext } from '@/hooks/useBalanceContext';
import { useServices } from '@/hooks/useServices';
import { asEvmChainDetails } from '@/utils/middlewareHelpers';
import { formatUnitsToNumber } from '@/utils/numberFormatters';

const { Text } = Typography;

const Loader = () => (
  <Flex align="center" justify="center" style={{ height: 100 }}>
    <Spin />
  </Flex>
);

const ChainName = ({ chainName }: { chainName: MiddlewareChain }) => (
  <Flex gap={8} align="center">
    <Image
      src={`/chains/${kebabCase(asEvmChainDetails(chainName).name)}-chain.png`}
      width={20}
      height={20}
      alt="chain logo"
    />
    <Text>{asEvmChainDetails(chainName).displayName}</Text>
  </Flex>
);

type ShowBalancesProps = {
  onNext: () => void;
  onCancel: () => void;
};

export const ShowBalances = ({ onNext, onCancel }: ShowBalancesProps) => {
  const { isLoading: isServicesLoading, selectedAgentConfig } = useServices();
  const toMiddlewareChain = selectedAgentConfig.middlewareHomeChainId;
  const tokenConfig = TOKEN_CONFIG[selectedAgentConfig.evmHomeChainId];
  const { isLoading: isBalanceLoading, totalStakedOlasBalance } =
    useBalanceContext();

  const balancesList = Object.entries(tokenConfig).map(
    ([untypedSymbol, token]) => {
      const symbol = untypedSymbol as TokenSymbol;
      const imageSrc =
        symbol === TokenSymbolMap.ETH
          ? `/chains/ethereum-chain.png`
          : `/tokens/${kebabCase(symbol)}-icon.png`;

      const balance = (() => {
        if (symbol === TokenSymbolMap.OLAS) return totalStakedOlasBalance;
        return 0; // TODO
      })();

      return {
        title: (
          <Flex gap={8} align="center">
            <Image
              src={imageSrc}
              width={20}
              height={20}
              alt={`${symbol} logo`}
            />
            <Text>{token.symbol}</Text>
          </Flex>
        ),
        value: balance ? `${formatUnitsToNumber(balance, token.decimals)}` : NA,
      };
    },
  );

  return (
    <Flex vertical gap={16}>
      <Text className="text-sm text-light">Available funds to withdraw</Text>
      <Card size="small" title={<ChainName chainName={toMiddlewareChain} />}>
        {isServicesLoading || isBalanceLoading ? (
          <Loader />
        ) : (
          <InfoBreakdownList
            list={balancesList.map((item) => ({
              left: item.title,
              leftClassName: 'text-light text-sm',
              right: item.value,
            }))}
            parentStyle={{ gap: 12 }}
          />
        )}
      </Card>

      <Text className="text-sm text-light">
        By clicking &quot;Withdraw&quot;, you&apos;ll only receive the above
        amount.
      </Text>
      <Flex gap={8}>
        <Button onClick={onCancel} block className="w-1/4">
          Cancel
        </Button>
        <Button type="primary" onClick={onNext} block>
          Proceed
        </Button>
      </Flex>
    </Flex>
  );
};
