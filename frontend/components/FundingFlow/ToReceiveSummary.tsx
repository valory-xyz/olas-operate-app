import { Flex, Typography } from 'antd';
import { Fragment } from 'react';

import { CardFlex } from '@/components/ui';
import { MiddlewareChain } from '@/constants';
import { FundingRunTokenAmount } from '@/types/FundingRun';

import { UNKNOWN_AMOUNT, UNKNOWN_TOKEN } from './constants';
import { TokenIcon } from './styles';
import {
  formatBaseUnits,
  formatDisplayAmount,
  getTokenImage,
  getTokenMeta,
} from './utils';

const { Text } = Typography;

export type ToReceiveItem = { symbol: string; amount: number };

type DisplayItem = { key: string; symbol: string; amount: string };

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
): DisplayItem[] =>
  toReceive.map(({ token, symbol, amount }) => {
    const meta = getTokenMeta(chain, token);
    return {
      key: token,
      symbol: symbol ?? meta?.symbol ?? UNKNOWN_TOKEN,
      amount: meta ? formatBaseUnits(amount, meta.decimals) : UNKNOWN_AMOUNT,
    };
  });

export const ToReceiveSummary = ({
  toReceive,
  destinationChain,
  fallback = [],
}: ToReceiveSummaryProps) => {
  // The run and the fallback order tokens differently; sorting stops a reshuffle between them.
  const items: DisplayItem[] = (
    toReceive
      ? runItemsToDisplay(toReceive, destinationChain)
      : fallback
          .filter(({ amount }) => amount > 0)
          .map(({ symbol, amount }) => ({
            key: symbol,
            symbol,
            amount: formatDisplayAmount(amount),
          }))
  ).sort((a, b) =>
    a.symbol.localeCompare(b.symbol, undefined, { sensitivity: 'base' }),
  );

  if (items.length === 0) return null;

  return (
    <CardFlex $noBorder $padding="16px 24px">
      <Flex vertical gap={4}>
        <Text className="text-neutral-tertiary">To receive</Text>
        <Flex gap={8} align="center" wrap>
          {items.map(({ key, symbol, amount }, index) => (
            <Fragment key={key}>
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
