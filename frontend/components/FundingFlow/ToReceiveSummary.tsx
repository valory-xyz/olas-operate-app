import { Flex, Typography } from 'antd';
import { Fragment } from 'react';

import { CardFlex } from '@/components/ui';
import { MiddlewareChain } from '@/constants';
import { FundingRunTokenAmount } from '@/types/FundingRun';
import { formatAmount } from '@/utils/numberFormatters';

import { UNKNOWN_AMOUNT } from './constants';
import { TokenIcon } from './styles';
import { formatBaseUnits, getTokenImage, getTokenMeta } from './utils';

const { Text } = Typography;

export type ToReceiveItem = { symbol: string; amount: number };

type ToReceiveSummaryProps = {
  /** The run's net delivery; takes precedence over `fallback` once a run exists. */
  toReceive?: FundingRunTokenAmount[];
  destinationChain: MiddlewareChain;
  /** The entry point's own requirement, shown before a run exists. */
  fallback?: ToReceiveItem[];
};

const runItemsToDisplay = (
  toReceive: FundingRunTokenAmount[],
  chain: MiddlewareChain,
): { symbol: string; amount: string }[] =>
  toReceive.map(({ token, symbol, amount }) => {
    const meta = getTokenMeta(chain, token);
    return {
      symbol,
      amount: meta ? formatBaseUnits(amount, meta.decimals) : UNKNOWN_AMOUNT,
    };
  });

export const ToReceiveSummary = ({
  toReceive,
  destinationChain,
  fallback = [],
}: ToReceiveSummaryProps) => {
  const items = toReceive
    ? runItemsToDisplay(toReceive, destinationChain)
    : fallback
        .filter(({ amount }) => amount > 0)
        .map(({ symbol, amount }) => ({
          symbol,
          amount: formatAmount(amount, 2),
        }));

  if (items.length === 0) return null;

  return (
    <CardFlex $noBorder $padding="16px 24px">
      <Flex vertical gap={4}>
        <Text className="text-neutral-tertiary">To receive</Text>
        <Flex gap={8} align="center" wrap>
          {items.map(({ symbol, amount }, index) => (
            <Fragment key={symbol}>
              {index > 0 && <Text className="text-neutral-tertiary">•</Text>}
              <Flex gap={6} align="center">
                <TokenIcon src={getTokenImage(symbol)} alt={symbol} />
                <Text>{`${amount} ${symbol}`}</Text>
              </Flex>
            </Fragment>
          ))}
        </Flex>
      </Flex>
    </CardFlex>
  );
};
