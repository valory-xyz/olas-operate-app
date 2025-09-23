import { useQueries } from '@tanstack/react-query';

import { CHAIN_CONFIG } from '@/config/chains';
import { TOKEN_CONFIG, TokenType } from '@/config/tokens';
import { REACT_QUERY_KEYS } from '@/constants/react-query-keys';
import { TokenSymbol } from '@/constants/token';
import { PEARL_API_URL } from '@/constants/urls';

const REFETCH_INTERVAL = 3_00_000; // 5 minutes

type FetchUsdPriceParams = {
  chainName: string;
  contractAddress: string;
  coinId: string;
};

const fetchUsdPrice = async ({
  chainName,
  contractAddress,
  coinId,
}: FetchUsdPriceParams) => {
  const params = new URLSearchParams();
  if (coinId) {
    params.append('coinId', coinId);
  } else {
    params.append('platform', chainName);
    params.append('address', contractAddress);
  }
  const response = await fetch(
    `${PEARL_API_URL}/api/usd-price?${params.toString()}`,
  );
  const { price, error } = await response.json();

  if (error) return 0;
  return price;
};

export type TokenDetails = Partial<{
  [S in TokenSymbol]: number;
}>;

export const useUsdAmounts = (
  chainName: string,
  requirements: TokenDetails[],
) => {
  const chainConfig = Object.values(CHAIN_CONFIG).find(
    (cfg) => cfg.name === chainName,
  );
  const evmChainId = chainConfig?.evmChainId;

  const queries = useQueries({
    queries: (requirements ?? []).map((req) => {
      const [symbol] = Object.keys(req);
      const tokenConfig =
        evmChainId != null ? TOKEN_CONFIG[evmChainId]?.[symbol] : undefined;

      const isNative = tokenConfig?.tokenType === TokenType.NativeGas;
      const isErc20OrWrapped =
        tokenConfig?.tokenType === TokenType.Erc20 ||
        tokenConfig?.tokenType === TokenType.Wrapped;

      const coinId = isNative ? symbol : '';
      const contractAddress = isErc20OrWrapped ? tokenConfig!.address : '';

      return {
        queryKey: REACT_QUERY_KEYS.USD_PRICE_KEY({
          chainName,
          req,
          isNative,
          coinId,
          contractAddress,
        }),
        enabled:
          (isNative && !!coinId) ||
          (isErc20OrWrapped && !!chainName && !!contractAddress),
        queryFn: async () =>
          fetchUsdPrice({ chainName, contractAddress, coinId }),
        staleTime: REFETCH_INTERVAL,
        refetchInterval: REFETCH_INTERVAL,
      };
    }),
  });

  const breakdown = requirements.map((req, idx) => {
    const [symbol, amount] = Object.entries(req)[0];
    const price = (queries[idx]?.data as number | undefined) ?? 0;
    const usdAmount = price * amount;
    return {
      symbol,
      amount,
      usdPrice: price,
      usdAmount,
    };
  });

  const totalUsd = breakdown.reduce((sum, i) => sum + i.usdAmount, 0);
  const isLoading = queries.some((q) => q.isLoading);
  const isFetching = queries.some((q) => q.isFetching);
  const isError = queries.some((q) => q.isError);
  const errors = queries.map((q) => q.error).filter(Boolean);

  return {
    breakdown,
    totalUsd,
    isLoading,
    isFetching,
    isError,
    error: errors[0] ?? null,
    refetchAll: () => Promise.all(queries.map((q) => q.refetch())),
  } as const;
};
