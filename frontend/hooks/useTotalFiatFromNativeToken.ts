import { useQuery } from '@tanstack/react-query';
import { round } from 'lodash';

import { OnRampNetworkConfig } from '@/components/OnRamp';
import { ON_RAMP_CHAIN_MAP, REACT_QUERY_KEYS } from '@/constants';
import { MoonPayService } from '@/service/MoonPay';
import { ensureRequired, Nullable } from '@/types';
import { asMiddlewareChain } from '@/utils';

/**
 * Adds a buffer (in USD) to the agent-required native amount so the user has
 * slippage headroom for the post-on-ramp Relay swap/bridge. Without this, a
 * Relay quote that drifts between fetch-time and execution-time could deliver
 * fewer agent-required tokens than the agent needs.
 */
const ON_RAMP_FIAT_BUFFER_USD = 5;

type UseTotalFiatFromNativeTokenProps = {
  nativeTokenAmount?: number;
  nativeAmount?: Nullable<number>;
  selectedChainId: OnRampNetworkConfig['selectedChainId'];
  skip?: boolean;
};

export const useTotalFiatFromNativeToken = ({
  nativeTokenAmount,
  nativeAmount,
  selectedChainId,
  skip = false,
}: UseTotalFiatFromNativeTokenProps) => {
  const selectedChainName = asMiddlewareChain(
    ensureRequired(selectedChainId, "Chain ID can't be empty"),
  );
  const chainConfig = ON_RAMP_CHAIN_MAP[selectedChainName];
  const fromChain = chainConfig
    ? asMiddlewareChain(chainConfig.chain)
    : selectedChainName;

  return useQuery({
    queryKey: REACT_QUERY_KEYS.ON_RAMP_QUOTE_KEY(fromChain, nativeTokenAmount!),
    queryFn: async () => {
      const baseNative = (nativeAmount ?? nativeTokenAmount)!;

      // Original quote: un-buffered native — to learn the conversionRate so we
      // can size the native-side buffer in fiat-equivalent terms.
      const originalQuote = await MoonPayService.getBuyQuote({
        currencyCode: chainConfig!.moonpayCurrencyCode,
        quoteCurrencyAmount: nativeTokenAmount!,
      });
      if (!originalQuote.success) throw new Error(originalQuote.error);
      const bufferedNative =
        baseNative +
        ON_RAMP_FIAT_BUFFER_USD / originalQuote.quote.conversionRate;

      // Second quote: buffered native — gives us the exact fee-included fiat
      // (totalAmount) that MoonPay will charge for the buffered amount.
      // Using two quotes (instead of computing totalAmount + $5)
      const bufferedQuote = await MoonPayService.getBuyQuote({
        currencyCode: chainConfig!.moonpayCurrencyCode,
        quoteCurrencyAmount: bufferedNative,
      });
      if (!bufferedQuote.success) throw new Error(bufferedQuote.error);

      return { quote: bufferedQuote.quote, bufferedNative };
    },
    select: (data) => ({
      fiatAmount: round(data.quote.totalAmount, 2),
      nativeAmountToDisplay: data.bufferedNative,
    }),
    enabled: !skip && !!chainConfig && !!fromChain && !!nativeTokenAmount,
  });
};
