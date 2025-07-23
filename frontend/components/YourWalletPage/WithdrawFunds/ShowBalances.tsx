import { Button, Card, Flex, Spin, Typography } from 'antd';
import { kebabCase, sum } from 'lodash';
import Image from 'next/image';
import React from 'react';

import { InfoBreakdownList } from '@/components/InfoBreakdown';
import { TOKEN_CONFIG } from '@/config/tokens';
import { SupportedMiddlewareChain } from '@/constants/chains';
import { TokenSymbol, TokenSymbolMap } from '@/constants/token';
import {
  useBalanceContext,
  useMasterBalances,
  useServiceBalances,
} from '@/hooks/useBalanceContext';
import { useRewardContext } from '@/hooks/useRewardContext';
import { useServices } from '@/hooks/useServices';
import { asEvmChainDetails } from '@/utils/middlewareHelpers';
import { balanceFormat } from '@/utils/numberFormatters';

const { Text } = Typography;

const Loader = () => (
  <Flex align="center" justify="center" style={{ height: 100 }}>
    <Spin />
  </Flex>
);

const ChainName = ({ chainName }: { chainName: SupportedMiddlewareChain }) => (
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

const getImgSrc = (symbol: TokenSymbol) =>
  symbol === TokenSymbolMap.ETH
    ? `/chains/ethereum-chain.png`
    : `/tokens/${kebabCase(symbol)}-icon.png`;

const useShowBalances = () => {
  const { accruedServiceStakingRewards } = useRewardContext();
  const { isLoading: isBalanceLoading, totalStakedOlasBalance } =
    useBalanceContext();
  const {
    masterEoaBalance,
    masterSafeNativeBalance,
    masterSafeOlasBalance,
    masterSafeErc20Balances,
  } = useMasterBalances();
  const {
    isLoading: isServicesLoading,
    selectedAgentConfig,
    selectedService,
  } = useServices();
  const {
    serviceSafeOlas,
    serviceSafeNativeBalances,
    serviceEoaNativeBalance,
    serviceSafeErc20Balances,
  } = useServiceBalances(selectedService?.service_config_id);

  const middlewareChain = selectedAgentConfig.middlewareHomeChainId;
  const tokenConfig = TOKEN_CONFIG[selectedAgentConfig.evmHomeChainId];

  const balances = Object.entries(tokenConfig).map(([untypedSymbol]) => {
    const symbol = untypedSymbol as TokenSymbol;

    const balance = (() => {
      // balance for OLAS
      if (symbol === TokenSymbolMap.OLAS) {
        const totalOlasBalance = sum([
          totalStakedOlasBalance,
          masterSafeOlasBalance,
          serviceSafeOlas?.balance,
          accruedServiceStakingRewards,
        ]);
        return `${balanceFormat(totalOlasBalance, 4)}`;
      }

      // balance for native tokens
      const serviceSafeNativeBalance = serviceSafeNativeBalances?.find(
        (b) => b.symbol === symbol,
      );
      if (symbol === asEvmChainDetails(middlewareChain).symbol) {
        const totalNativeBalance = sum([
          masterSafeNativeBalance,
          masterEoaBalance,
          serviceSafeNativeBalance?.balance,
          serviceEoaNativeBalance?.balance,
        ]);
        return balanceFormat(totalNativeBalance, 4);
      }

      // balance for other required tokens (eg. USDC)
      const serviceSafeErc20Balance = serviceSafeErc20Balances?.find(
        (b) => b.symbol === symbol,
      );
      const masterSafeErc20Balance = masterSafeErc20Balances?.[symbol] ?? 0;
      const totalBalance = sum([
        masterSafeErc20Balance,
        serviceSafeErc20Balance?.balance,
      ]);
      return balanceFormat(totalBalance, 4);
    })();

    return { symbol, imageSrc: getImgSrc(symbol), value: balance };
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
