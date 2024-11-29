import { MiddlewareChain } from '@/client';
import { EvmChainId } from '@/enums/Chain';
import { asEvmChainId } from '@/utils/middlewareHelpers';

type Url = `http${'s' | ''}://${string}`;

export const BACKEND_URL: Url = `http://localhost:${process.env.NODE_ENV === 'production' ? 8765 : 8000}/api`;

export const BACKEND_URL_V2: Url = `http://localhost:${process.env.NODE_ENV === 'production' ? 8765 : 8000}/api/v2`;

// cowswap
export const COW_SWAP_GNOSIS_XDAI_OLAS_URL: Url =
  'https://swap.cow.fi/#/100/swap/WXDAI/OLAS';

// olas.network
export const FAQ_URL: Url = 'https://olas.network/operate#faq';
export const DOWNLOAD_URL: Url = 'https://olas.network/operate#download';

// thegraph
export const GNOSIS_REWARDS_HISTORY_SUBGRAPH_URL: Url =
  'https://api.studio.thegraph.com/query/81371/gnosis-pearl-rewards-history/version/latest';

// discord
export const SUPPORT_URL: Url =
  'https://discord.com/channels/899649805582737479/1244588374736502847';
export const DISCORD_TICKET_URL: Url =
  'https://discord.com/channels/899649805582737479/1245674435160178712/1263815577240076308';

// github
export const GITHUB_API_LATEST_RELEASE: Url =
  'https://api.github.com/repos/valory-xyz/olas-operate-app/releases/latest';

// explorers @note DO NOT END WITH `/`
// export const OPTIMISM_EXPLORER_URL: Url = 'https://optimistic.etherscan.io';
export const GNOSIS_EXPLORER_URL: Url = 'https://gnosisscan.io';

export const EXPLORER_URL_BY_MIDDLEWARE_CHAIN: Record<
  string | MiddlewareChain,
  Url
> = {
  // [MiddlewareChain.OPTIMISM]: OPTIMISM_EXPLORER_URL,
  [MiddlewareChain.GNOSIS]: GNOSIS_EXPLORER_URL,
};

export const SWAP_URL_BY_EVM_CHAIN: Record<number | EvmChainId, Url> = {
  // [EvmChainId.OPTIMISM]: COW_SWAP_GNOSIS_XDAI_OLAS_URL,
  [EvmChainId.Gnosis]: COW_SWAP_GNOSIS_XDAI_OLAS_URL,
};

export const EXPLORER_URL_BY_EVM_CHAIN_ID: Record<number | EvmChainId, Url> =
  Object.fromEntries(
    Object.entries(EXPLORER_URL_BY_MIDDLEWARE_CHAIN).map(
      ([middlewareChain, url]) => [asEvmChainId(middlewareChain), url],
    ),
  );
