import { useQueries } from '@tanstack/react-query';

import { CHAIN_CONFIG } from '@/config/chains';
import { TOKEN_CONFIG, TokenType } from '@/config/tokens';

const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';
const COINGECKO_API_KEY = process.env.NEXT_PUBLIC_COINGECKO_API_KEY;
const REFETCH_INTERVAL = 60_000;

const COINGECKO_PLATFORM_BY_CHAIN_NAME: Record<string, string> = {
  Base: 'base',
  Ethereum: 'ethereum',
  Gnosis: 'xdai',
  Mode: 'mode',
  Optimism: 'optimistic-ethereum',
};

const COINGECKO_COIN_ID_BY_NATIVE_SYMBOL: Record<string, string> = {
  ETH: 'ethereum',
  XDAI: 'xdai',
};

const getHeaders = () => {
  const headers: Record<string, string> = { accept: 'application/json' };
  if (COINGECKO_API_KEY) headers['x-cg-demo-api-key'] = COINGECKO_API_KEY;
  return headers;
};

const IS_MOCK = true;

export const fetchTokenUsdPrice = async (
  platform: string,
  contractAddress: string,
  signal?: AbortSignal,
): Promise<number> => {
  if (!platform || !contractAddress) return 0;
  const params = new URLSearchParams({ platform, address: contractAddress });
  const requestUrl = `/api/price/token?${params.toString()}`;

  if (IS_MOCK) {
    return Promise.resolve(0);
  }

  const response = await fetch(requestUrl, {
    method: 'GET',
    signal,
    headers: { accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch token price (status ${response.status})`);
  }
  const data = (await response.json()) as { price: number };
  return typeof data.price === 'number' ? data.price : 0;
};

const fetchNativeUsdPrice = async (
  coinId: string,
  signal?: AbortSignal,
): Promise<number> => {
  if (!coinId) return 0;
  const params = new URLSearchParams({ ids: coinId, vs_currencies: 'usd' });
  const requestUrl = `${COINGECKO_API_BASE}/simple/price?${params.toString()}`;

  if (IS_MOCK) {
    return Promise.resolve(0);
  }

  const response = await fetch(requestUrl, {
    method: 'GET',
    headers: getHeaders(),
    signal,
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch native price (status ${response.status})`);
  }
  const data = await response.json();
  const priceEntry = data?.[coinId]?.usd;
  return typeof priceEntry === 'number' ? priceEntry : 0;
};

export type TokenDetails = {
  symbol: string;
  amount: number;
};

export const useUsdAmounts = (
  chainName: string,
  requirements: TokenDetails[],
) => {
  const chainConfig = Object.values(CHAIN_CONFIG).find(
    (cfg) => cfg.name === chainName,
  );
  const evmChainId = chainConfig?.evmChainId;
  const platform = COINGECKO_PLATFORM_BY_CHAIN_NAME[chainName] ?? '';

  const queries = useQueries({
    queries: (requirements ?? []).map((req) => {
      const tokenConfig =
        evmChainId != null ? TOKEN_CONFIG[evmChainId]?.[req.symbol] : undefined;

      const isNative = tokenConfig?.tokenType === TokenType.NativeGas;
      const isErc20OrWrapped =
        tokenConfig?.tokenType === TokenType.Erc20 ||
        tokenConfig?.tokenType === TokenType.Wrapped;

      const coinId = isNative
        ? COINGECKO_COIN_ID_BY_NATIVE_SYMBOL[req.symbol] ?? ''
        : '';
      const contractAddress = isErc20OrWrapped ? tokenConfig!.address : '';
      const hasValidTokenQueryParams =
        isErc20OrWrapped && platform && contractAddress;

      return {
        queryKey: [
          'usdPrice',
          chainName,
          req.symbol,
          isNative ? coinId : platform,
          isNative ? 'native' : contractAddress,
        ] as const,
        enabled: Boolean((isNative && coinId) || hasValidTokenQueryParams),
        queryFn: async ({ signal }) => {
          if (isNative) return fetchNativeUsdPrice(coinId, signal);
          return fetchTokenUsdPrice(platform, contractAddress, signal);
        },
        staleTime: REFETCH_INTERVAL,
        refetchInterval: REFETCH_INTERVAL,
      };
    }),
  });

  const breakdown = requirements.map((req, idx) => {
    const price = (queries[idx]?.data as number | undefined) ?? 0;
    const usdAmount = price * req.amount;
    return {
      symbol: req.symbol,
      amount: req.amount,
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
