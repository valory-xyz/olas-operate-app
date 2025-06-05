import { MiddlewareChain, SupportedMiddlewareChain } from '@/client';
import { EvmChainId } from '@/enums/Chain';

type Url = `http${'s' | ''}://${string}`;

export const BACKEND_URL: Url = `http://localhost:${process.env.NODE_ENV === 'production' ? 8765 : 8000}/api`;

export const BACKEND_URL_V2: Url = `http://localhost:${process.env.NODE_ENV === 'production' ? 8765 : 8000}/api/v2`;

// swap URLs
const COW_SWAP_GNOSIS_XDAI_OLAS_URL: Url =
  'https://swap.cow.fi/#/100/swap/WXDAI/OLAS';
const SWAP_BASE_URL: Url = 'https://balancer.fi/swap/base/ETH/OLAS';
const SWAP_MODE_URL: Url =
  'https://balancer.fi/swap/mode/0xd988097fb8612cc24eec14542bc03424c656005f/0xcfd1d50ce23c46d3cf6407487b2f8934e96dc8f9';
const SWAP_CELO_URL: Url =
  'https://app.ubeswap.org/#/swap?inputCurrency=0x471ece3750da237f93b8e339c536989b8978a438&outputCurrency=0xacffae8e57ec6e394eb1b41939a8cf7892dbdc51';
const SWAP_OPTIMISM_URL: Url =
  'https://balancer.fi/pools/optimism/v2/0x5bb3e58887264b667f915130fd04bbb56116c27800020000000000000000012a';

// olas.network
export const PEARL_URL: Url = 'https://olas.network/pearl';
export const FAQ_URL: Url = 'https://olas.network/pearl#faq';
export const TERMS_AND_CONDITIONS_URL: Url = 'https://olas.network/pearl-terms';
export const DOWNLOAD_URL: Url = 'https://olas.network/pearl#update';

// thegraph
export const REWARDS_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN: Record<
  EvmChainId,
  Url
> = {
  [EvmChainId.Gnosis]:
    'https://gateway.thegraph.com/api/5c035877a4af18d178c96afe55ed41ae/subgraphs/id/F3iqL2iw5UTrP1qbb4S694pGEkBwzoxXp1TRikB2K4e',
  [EvmChainId.Base]:
    'https://gateway.thegraph.com/api/5c035877a4af18d178c96afe55ed41ae/subgraphs/id/9etc5Ht8eQGghXrkbWJk2yMzNypCFTL46m1iLXqE2rnq',
  [EvmChainId.Mode]:
    'https://gateway.thegraph.com/api/5c035877a4af18d178c96afe55ed41ae/subgraphs/id/Fe6oYUKbSGP7a16NowseTU82MVG9D2xWbBUCz4MPB4d4',
  [EvmChainId.Celo]:
    'https://api.studio.thegraph.com/query/67875/olas-celo-staking/version/latest',
  [EvmChainId.Optimism]:
    'https://gateway.thegraph.com/api/5c035877a4af18d178c96afe55ed41ae/subgraphs/id/2fe1izA4aVvBHVwbPzP1BqxLkoR9ebygWM9iHXwLCnPE',
};

// discord
export const SUPPORT_URL: Url =
  'https://discord.com/channels/899649805582737479/1244588374736502847';
export const DISCORD_TICKET_URL: Url =
  'https://discord.com/channels/899649805582737479/1245674435160178712/1263815577240076308';

// github
export const GITHUB_API_LATEST_RELEASE: Url =
  'https://api.github.com/repos/valory-xyz/olas-operate-app/releases/latest';

// explorers @note DO NOT END WITH `/`
const GNOSIS_EXPLORER_URL: Url = 'https://gnosisscan.io';
const BASE_EXPLORER_URL: Url = 'https://basescan.org';
const MODE_EXPLORER_URL: Url = 'https://modescan.io';
const CELO_EXPLORER_URL: Url = 'https://celoscan.io';
const OPTIMISM_EXPLORER_URL: Url = 'https://optimistic.etherscan.io';

// others
export const TENDERLY_URL: string = 'https://tenderly.co';
export const COINGECKO_URL: string = 'https://www.coingecko.com';
export const COINGECKO_DEMO_API_KEY: string =
  'https://support.coingecko.com/hc/en-us/articles/21880397454233-User-Guide-How-to-sign-up-for-CoinGecko-Demo-API-and-generate-an-API-key';
export const GEMINI_API_URL: string = 'https://aistudio.google.com/app/apikey';

export const EXPLORER_URL_BY_MIDDLEWARE_CHAIN: Record<
  SupportedMiddlewareChain,
  Url
> = {
  [MiddlewareChain.GNOSIS]: GNOSIS_EXPLORER_URL,
  [MiddlewareChain.BASE]: BASE_EXPLORER_URL,
  [MiddlewareChain.MODE]: MODE_EXPLORER_URL,
  [MiddlewareChain.CELO]: CELO_EXPLORER_URL,
  [MiddlewareChain.OPTIMISM]: OPTIMISM_EXPLORER_URL,
};

export const BLOCKSCOUT_URL_BY_MIDDLEWARE_CHAIN: Record<
  SupportedMiddlewareChain,
  Url
> = {
  [MiddlewareChain.GNOSIS]: 'https://gnosis.blockscout.com',
  [MiddlewareChain.BASE]: 'https://base.blockscout.com',
  [MiddlewareChain.MODE]: 'https://explorer.mode.network',
  [MiddlewareChain.CELO]: 'https://celo.blockscout.com',
  [MiddlewareChain.OPTIMISM]: 'https://optimism.blockscout.com',
};

export const SWAP_URL_BY_EVM_CHAIN: Record<EvmChainId, Url> = {
  [EvmChainId.Gnosis]: COW_SWAP_GNOSIS_XDAI_OLAS_URL,
  [EvmChainId.Base]: SWAP_BASE_URL,
  [EvmChainId.Mode]: SWAP_MODE_URL,
  [EvmChainId.Celo]: SWAP_CELO_URL,
  [EvmChainId.Optimism]: SWAP_OPTIMISM_URL,
};
