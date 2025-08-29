import { useQuery } from '@tanstack/react-query';

import { onRampChainMap, SupportedMiddlewareChain } from '@/constants/chains';
import { REACT_QUERY_KEYS } from '@/constants/react-query-keys';
import { ON_RAMP_GATEWAY_URL } from '@/constants/urls';
import { useServices } from '@/hooks/useServices';
import { asMiddlewareChain } from '@/utils/middlewareHelpers';

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

const transakPriceUrl = `${ON_RAMP_GATEWAY_URL}price-quote/`;

const fetchTransakQuote = async (
  network: SupportedMiddlewareChain,
  amount: number | string,
  signal: AbortSignal,
): Promise<{ response: Quote }> => {
  const options = {
    method: 'GET',
    headers: { accept: 'application/json' },
    signal,
  };

  const params = new URLSearchParams({
    fiatCurrency: 'USD',
    cryptoCurrency: 'ETH',
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

export const useTotalFiatFromNativeToken = (nativeTokenAmount?: number) => {
  const { selectedAgentConfig } = useServices();
  const fromChainName = asMiddlewareChain(selectedAgentConfig.evmHomeChainId);
  const networkName = asMiddlewareChain(onRampChainMap[fromChainName]);

  return useQuery({
    queryKey: REACT_QUERY_KEYS.ON_RAMP_QUOTE_KEY(
      networkName,
      nativeTokenAmount!,
    ),
    queryFn: async ({ signal }) => {
      try {
        const { response } = await fetchTransakQuote(
          networkName,
          nativeTokenAmount!,
          signal,
        );
        return response;
      } catch (error) {
        console.error('Error fetching Transak quote', error);
        throw error;
      }
    },
    select: (data) => data.fiatAmount,
    enabled: !!networkName && !!nativeTokenAmount,
  });
};
