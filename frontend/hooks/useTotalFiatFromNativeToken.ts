import { useQuery } from '@tanstack/react-query';

import { OnRampNetworkConfig } from '@/components/OnRamp';
import { TokenSymbol } from '@/config/tokens';
import {
  ON_RAMP_CHAIN,
  REACT_QUERY_KEYS,
  SupportedMiddlewareChain,
} from '@/constants';
import { ON_RAMP_GATEWAY_URL } from '@/constants/urls';
import { ensureRequired } from '@/types';
import { asMiddlewareChain } from '@/utils';

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
  selectedChainId: OnRampNetworkConfig['selectedChainId'];
};

export const useTotalFiatFromNativeToken = ({
  nativeTokenAmount,
  selectedChainId,
}: UseTotalFiatFromNativeTokenProps) => {
  const selectedChainName = asMiddlewareChain(
    ensureRequired(selectedChainId, "Chain ID can't be empty"),
  );
  const { chain, cryptoCurrency } = ON_RAMP_CHAIN[selectedChainName];
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
    select: (data) => data.fiatAmount,
    enabled: !!fromChain && !!nativeTokenAmount,
  });
};
