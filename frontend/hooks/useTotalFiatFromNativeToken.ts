import { useQuery } from '@tanstack/react-query';
import { round } from 'lodash';

import { OnRampNetworkConfig } from '@/components/OnRamp';
import { ON_RAMP_CHAIN_MAP, REACT_QUERY_KEYS } from '@/constants';
import { MoonPayService } from '@/service/MoonPay';
import { ensureRequired, Nullable } from '@/types';
import { asMiddlewareChain } from '@/utils';

/**
 * Adds a buffer to the total fiat amount calculated from the native token
 * amount to account for price fluctuations during the on-ramp process.
 */
const ON_RAMP_FIAT_BUFFER_USD = 5;

type UseTotalFiatFromNativeTokenProps = {
  nativeTokenAmount?: number;
  nativeAmountToPay?: Nullable<number>;
  selectedChainId: OnRampNetworkConfig['selectedChainId'];
  skip?: boolean;
};

export const useTotalFiatFromNativeToken = ({
  nativeTokenAmount,
  nativeAmountToPay,
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
      const result = await MoonPayService.getBuyQuote({
        currencyCode: chainConfig!.moonpayCurrencyCode,
        quoteCurrencyAmount: nativeTokenAmount!,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.quote;
    },
    select: (data) => {
      // Buffer math: add $5 to the fiat estimate, and add the equivalent
      // native amount (using conversionRate) to nativeAmountToPay so the
      // user receives ~$5 of headroom for slippage.
      const bufferedNative =
        (nativeAmountToPay ?? 0) +
        ON_RAMP_FIAT_BUFFER_USD / data.conversionRate;

      return {
        // round avoids 15.38 + 5 = 20.380000000000003 issues
        fiatAmount: round(data.baseCurrencyAmount + ON_RAMP_FIAT_BUFFER_USD, 2),
        /**
         * JUST TO DISPLAY TO THE USER
         * the buffered native amount is shown in the on-ramp UI so the user
         * sees the same amount they will pay in MoonPay.
         */
        nativeAmountToDisplay: bufferedNative,
      };
    },
    enabled: !skip && !!chainConfig && !!fromChain && !!nativeTokenAmount,
  });
};
