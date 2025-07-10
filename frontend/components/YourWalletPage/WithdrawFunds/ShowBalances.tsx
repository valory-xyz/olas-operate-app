import { Button, Card, Flex, Spin, Typography } from 'antd';
import { kebabCase } from 'lodash';
import Image from 'next/image';
import React from 'react';

import { InfoBreakdownList } from '@/components/InfoBreakdown';
import { TOKEN_CONFIG } from '@/config/tokens';
import { MiddlewareChain } from '@/constants/chains';
import { NA } from '@/constants/symbols';
import { TokenSymbol, TokenSymbolMap } from '@/constants/token';
import {
  useBalanceContext,
  useServiceBalances,
} from '@/hooks/useBalanceContext';
import { useServices } from '@/hooks/useServices';
import { asEvmChainDetails } from '@/utils/middlewareHelpers';
import { balanceFormat, formatUnitsToNumber } from '@/utils/numberFormatters';

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

const useShowBalances = () => {
  const {
    isLoading: isServicesLoading,
    selectedAgentConfig,
    selectedService,
  } = useServices();
  const { serviceSafeErc20Balances, serviceSafeNativeBalances } =
    useServiceBalances(selectedService?.service_config_id);
  const { isLoading: isBalanceLoading, totalStakedOlasBalance } =
    useBalanceContext();

  const middlewareChain = selectedAgentConfig.middlewareHomeChainId;
  const tokenConfig = TOKEN_CONFIG[selectedAgentConfig.evmHomeChainId];

  const balances = Object.entries(tokenConfig).map(([untypedSymbol, token]) => {
    const symbol = untypedSymbol as TokenSymbol;
    const imageSrc =
      symbol === TokenSymbolMap.ETH
        ? `/chains/ethereum-chain.png`
        : `/tokens/${kebabCase(symbol)}-icon.png`;

    const balance = (() => {
      if (symbol === TokenSymbolMap.OLAS) {
        return totalStakedOlasBalance
          ? `${formatUnitsToNumber(totalStakedOlasBalance, token.decimals)}`
          : NA;
      }

      const safeNativeBalance = serviceSafeNativeBalances?.find(
        (b) => b.symbol === symbol,
      );
      if (safeNativeBalance) {
        return balanceFormat(safeNativeBalance.balance, 4);
      }

      const serviceSafeBalance = serviceSafeErc20Balances?.find(
        (b) => b.symbol === symbol,
      );
      return serviceSafeBalance
        ? balanceFormat(serviceSafeBalance.balance, 4)
        : 0;
    })();

    return { symbol, imageSrc, value: balance };
  });

  return {
    isLoading: isServicesLoading || isBalanceLoading,
    middlewareChain,
    balances,
  };
};

type ShowBalancesProps = {
  onNext: () => void;
  onCancel: () => void;
};

export const ShowBalances = ({ onNext, onCancel }: ShowBalancesProps) => {
  const { isLoading, middlewareChain, balances } = useShowBalances();

  return (
    <Flex vertical gap={16}>
      <Text className="text-sm text-light">Available funds to withdraw</Text>
      <Card size="small" title={<ChainName chainName={middlewareChain} />}>
        {isLoading ? (
          <Loader />
        ) : (
          <InfoBreakdownList
            list={balances.map((item) => ({
              left: (
                <Flex gap={8} align="center">
                  <Image
                    src={item.imageSrc}
                    width={20}
                    height={20}
                    alt={`${item.symbol} logo`}
                  />
                  <Text>{item.symbol}</Text>
                </Flex>
              ),
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
