import { MiddlewareChain } from '@/client';
import { EvmChainId } from '@/enums/Chain';

type Url = `http${'s' | ''}://${string}`;

export const BACKEND_URL: Url = `http://localhost:${process.env.NODE_ENV === 'production' ? 8765 : 8000}/api`;

export const BACKEND_URL_V2: Url = `http://localhost:${process.env.NODE_ENV === 'production' ? 8765 : 8000}/api/v2`;

// swap URLs
const COW_SWAP_GNOSIS_XDAI_OLAS_URL: Url =
  'https://swap.cow.fi/#/100/swap/WXDAI/OLAS';
const SWAP_BASE_URL: Url = 'https://balancer.fi/swap/base/ETH/OLAS';
// TODO: Modius - confirm this URL is correct
const SWAP_MODE_URL: Url =
  'https://jumper.exchange/?fromChain=34443&fromToken=0x0000000000000000000000000000000000000000&toChain=34443&toToken=0xcfD1D50ce23C46D3Cf6407487B2F8934e96DC8f9';

// olas.network
export const OPERATE_URL: Url = 'https://olas.network/operate';
export const FAQ_URL: Url = 'https://olas.network/operate#faq';
export const DOWNLOAD_URL: Url = 'https://olas.network/operate#download';

// thegraph
export const REWARDS_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN = {
  [EvmChainId.Ethereum]: '',
  [EvmChainId.Optimism]: '',
  [EvmChainId.Gnosis]:
    'https://api.studio.thegraph.com/query/81371/gnosis-pearl-rewards-history/version/latest',
  [EvmChainId.Base]:
    'https://api.studio.thegraph.com/query/67875/olas-base-staking-rewards-history/version/latest',
  [EvmChainId.Mode]:
    'https://api.studio.thegraph.com/query/67875/olas-mode-staking-rewards-history/version/latest',
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
// export const OPTIMISM_EXPLORER_URL: Url = 'https://optimistic.etherscan.io';
const GNOSIS_EXPLORER_URL: Url = 'https://gnosisscan.io';
const BASE_EXPLORER_URL: Url = 'https://basescan.org';
const MODE_EXPLORER_URL: Url = 'https://explorer.mode.network';

export const EXPLORER_URL_BY_MIDDLEWARE_CHAIN: Record<
  string | MiddlewareChain,
  Url
> = {
  [MiddlewareChain.GNOSIS]: GNOSIS_EXPLORER_URL,
  // [MiddlewareChain.OPTIMISM]: OPTIMISM_EXPLORER_URL,
  [MiddlewareChain.BASE]: BASE_EXPLORER_URL,
  [MiddlewareChain.MODE]: MODE_EXPLORER_URL,
};

export const BLOCKSCOUT_URL_BY_MIDDLEWARE_CHAIN: Record<
  string | MiddlewareChain,
  Url
> = {
  [MiddlewareChain.GNOSIS]: 'https://gnosis.blockscout.com',
  [MiddlewareChain.BASE]: 'https://base.blockscout.com',
};

export const SWAP_URL_BY_EVM_CHAIN: Record<number | EvmChainId, Url> = {
  [EvmChainId.Gnosis]: COW_SWAP_GNOSIS_XDAI_OLAS_URL,
  // [EvmChainId.OPTIMISM]: COW_SWAP_GNOSIS_XDAI_OLAS_URL,
  [EvmChainId.Base]: SWAP_BASE_URL,
  [EvmChainId.Mode]: SWAP_MODE_URL,
};
