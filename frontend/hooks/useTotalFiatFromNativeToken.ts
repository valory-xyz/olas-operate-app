import { useQuery } from '@tanstack/react-query';
import { round } from 'lodash';

import { OnRampNetworkConfig } from '@/components/OnRamp';
import { TokenSymbol } from '@/config/tokens';
import {
  ON_RAMP_CHAIN_MAP,
  REACT_QUERY_KEYS,
  SupportedMiddlewareChain,
} from '@/constants';
import { ON_RAMP_GATEWAY_URL } from '@/constants/urls';
import { ensureRequired, Nullable } from '@/types';
import { asMiddlewareChain } from '@/utils';

/**
 * Adds a buffer to the total fiat amount calculated from the native token amount
 * to account for price fluctuations during the on-ramp process.
 */
const ON_RAMP_FIAT_BUFFER_USD = 5;

// function to calculate buffered ETH amount based on the fiat buffer
// eg., if fiat buffer is $3, and 1 ETH = $1500, then buffered ETH = (3 / 1500) = 0.002 ETH
const getEthWithBuffer = (
  ethAmount: number,
  fiatAmount: number,
  cryptoAmount: number,
) => {
  if (!fiatAmount) {
    return ethAmount;
  }
  const bufferedEth = (cryptoAmount / fiatAmount) * ON_RAMP_FIAT_BUFFER_USD;
  return ethAmount + bufferedEth;
};

type FeeBreakdownItem = {
  name: string;
  value: number;
  id: string;
  ids: string[];
};

type Quote = {
  quoteId: string;
  conversionPrice: number;
  marketConversionPrice: number;
  slippage: number;
  fiatCurrency: string;
  cryptoCurrency: string;
  paymentMethod: string;
  fiatAmount: number;
  cryptoAmount: number;
  isBuyOrSell: 'BUY' | 'SELL';
  network: string;
  feeDecimal: number;
  totalFee: number;
  feeBreakdown: FeeBreakdownItem[];
  nonce: number;
  cryptoLiquidityProvider: string;
  notes: string[];
};

const transakPriceUrl = `${ON_RAMP_GATEWAY_URL}price-quote`;

type FetchTransakQuoteParams = {
  network: SupportedMiddlewareChain;
  amount: number | string;
  cryptoCurrency?: TokenSymbol;
};

const fetchTransakQuote = async (
  { network, amount, cryptoCurrency = 'ETH' }: FetchTransakQuoteParams,
  signal: AbortSignal,
): Promise<{ response: Quote }> => {
  const options = {
    method: 'GET',
    headers: { accept: 'application/json' },
    signal,
  };

  const params = new URLSearchParams({
    fiatCurrency: 'USD',
    cryptoCurrency,
    isBuyOrSell: 'BUY',
    network,
    paymentMethod: 'credit_debit_card',
    cryptoAmount: amount.toString(),
  });

  const response = await fetch(
    `${transakPriceUrl}?${params.toString()}`,
    options,
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch Transak quote: ${response.status}`);
  }

  return response.json();
};

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
  const { chain, cryptoCurrency } = ON_RAMP_CHAIN_MAP[selectedChainName];
  const fromChain = asMiddlewareChain(chain);

  return useQuery({
    queryKey: REACT_QUERY_KEYS.ON_RAMP_QUOTE_KEY(fromChain, nativeTokenAmount!),
    queryFn: async ({ signal }) => {
      try {
        const { response } = await fetchTransakQuote(
          {
            network: fromChain,
            amount: nativeTokenAmount!,
            cryptoCurrency,
          },
          signal,
        );
        return response;
      } catch (error) {
        console.error('Error fetching Transak quote', error);
        throw error;
      }
    },
    select: (data) => {
      const nativeAmountToDisplay = getEthWithBuffer(
        nativeAmountToPay ?? 0,
        data.fiatAmount,
        data.cryptoAmount,
      );

      return {
        // round is used to avoid 15.38 + 3 = 18.380000000000003 issues
        fiatAmount: round(data.fiatAmount + ON_RAMP_FIAT_BUFFER_USD, 2),
        /**
         * JUST TO DISPLAY TO THE USER
         * calculate the buffered ETH amount to display to the user during the on-ramp process.
         */
        nativeAmountToDisplay,
      };
    },
    enabled: !skip && !!fromChain && !!nativeTokenAmount,
  });
};
