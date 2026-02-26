import {
  EvmChainId,
  EvmChainIdMap,
  MiddlewareChainMap,
  SupportedMiddlewareChain,
} from './chains';

type Url = `http${'s' | ''}://${string}`;

export const BACKEND_URL: Url = `https://localhost:${process.env.NODE_ENV === 'production' ? 8765 : 8000}/api`;
export const BACKEND_URL_V2: Url = `https://localhost:${process.env.NODE_ENV === 'production' ? 8765 : 8000}/api/v2`;

// pearl site
export const PEARL_URL: Url = 'https://www.pearl.you';
export const FAQ_URL: Url = `${PEARL_URL}#FAQ`;
export const DOWNLOAD_URL: Url = `${PEARL_URL}#update`;
// to be moved to pearl site
export const TERMS_AND_CONDITIONS_URL: Url = 'https://olas.network/pearl-terms';

// thegraph
export const REWARDS_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN: Record<
  EvmChainId,
  Url
> = {
  [EvmChainIdMap.Gnosis]: 'https://staking-gnosis.subgraph.autonolas.tech',
  [EvmChainIdMap.Base]: 'https://staking-base.subgraph.autonolas.tech',
  [EvmChainIdMap.Mode]: 'https://staking-mode.subgraph.autonolas.tech',
  [EvmChainIdMap.Optimism]: 'https://staking-optimism.subgraph.autonolas.tech',
  [EvmChainIdMap.Polygon]: 'https://staking-polygon.subgraph.autonolas.tech',
};

// discord
export const SUPPORT_URL: Url =
  'https://discord.com/channels/899649805582737479/1244588374736502847';
export const COMMUNITY_ASSISTANCE_URL: Url =
  'https://discord.com/channels/899649805582737479/1335000001797034044';

// github
export const GITHUB_API_LATEST_RELEASE: Url =
  'https://api.github.com/repos/valory-xyz/olas-operate-app/releases/latest';
export const GITHUB_API_RELEASES: Url =
  'https://github.com/valory-xyz/olas-operate-app/releases';

// others
export const COINGECKO_URL: string = 'https://www.coingecko.com';
export const COINGECKO_DEMO_API_URL: string =
  'https://support.coingecko.com/hc/en-us/articles/21880397454233-User-Guide-How-to-sign-up-for-CoinGecko-Demo-API-and-generate-an-API-key';
export const GEMINI_API_URL: string = 'https://aistudio.google.com/app/apikey';
export const OPEN_AI_API_URL: string =
  'https://help.openai.com/en/articles/4936850-where-do-i-find-my-openai-api-key';
export const X_ACCOUNT_API_TOKENS_GUIDE_URL: Url =
  'https://github.com/dvilelaf/meme-ooorr/blob/main/docs/twitter_dev_account.md';
export const X_DEVELOPER_CONSOLE_URL: Url = 'https://console.x.ai/';

export const WEB3AUTH_URL: Url = 'https://web3auth.io';
export const WEB3AUTH_TERMS_AND_CONDITIONS_URL: Url = `${WEB3AUTH_URL}/docs/legal/terms-and-conditions`;
export const SAFE_URL: Url = 'https://safe.global/';
export const PEARL_LICENSE: Url =
  'https://github.com/valory-xyz/olas-operate-app/blob/main/LICENSE';

// explorers @note DO NOT END WITH `/`
const GNOSIS_EXPLORER_URL: Url = 'https://gnosisscan.io';
const BASE_EXPLORER_URL: Url = 'https://basescan.org';
const MODE_EXPLORER_URL: Url = 'https://modescan.io';
const OPTIMISM_EXPLORER_URL: Url = 'https://optimistic.etherscan.io';
const POLYGON_EXPLORER_URL: Url = 'https://polygonscan.com';

export const EXPLORER_URL_BY_MIDDLEWARE_CHAIN: Record<
  SupportedMiddlewareChain,
  Url
> = {
  [MiddlewareChainMap.GNOSIS]: GNOSIS_EXPLORER_URL,
  [MiddlewareChainMap.BASE]: BASE_EXPLORER_URL,
  [MiddlewareChainMap.MODE]: MODE_EXPLORER_URL,
  [MiddlewareChainMap.OPTIMISM]: OPTIMISM_EXPLORER_URL,
  [MiddlewareChainMap.POLYGON]: POLYGON_EXPLORER_URL,
};

export const BLOCKSCOUT_URL_BY_MIDDLEWARE_CHAIN: Record<
  SupportedMiddlewareChain,
  Url
> = {
  [MiddlewareChainMap.GNOSIS]: 'https://gnosis.blockscout.com',
  [MiddlewareChainMap.BASE]: 'https://base.blockscout.com',
  [MiddlewareChainMap.MODE]: 'https://explorer.mode.network',
  [MiddlewareChainMap.OPTIMISM]: 'https://optimism.blockscout.com',
  [MiddlewareChainMap.POLYGON]: 'https://polygon.blockscout.com',
};

// on-ramp
export const ON_RAMP_GATEWAY_URL = `https://proxy.transak.${process.env.NODE_ENV === 'production' ? '' : 'staging.'}autonolas.tech/`;

// pearl-api url
export const PEARL_API_URL = 'https://pearl-api.olas.network';

// web3auth
const WEB3AUTH_GATEWAY_URL = `${PEARL_API_URL}/web3auth`;
export const WEB3AUTH_LOGIN_URL = `${WEB3AUTH_GATEWAY_URL}/login`;
export const WEB3AUTH_SWAP_OWNER_URL = `${WEB3AUTH_GATEWAY_URL}/swap-owner-session`;

// support API
export const SUPPORT_API_URL = `${PEARL_API_URL}/api/zendesk`;

// geo eligibility
export const GEO_ELIGIBILITY_API_URL = `${PEARL_API_URL}/api/geo/agent-eligibility`;
export const GEO_ELIGIBILITY_DOCS_URL =
  'https://docs.polymarket.com/polymarket-learn/FAQ/geoblocking#close-only-countries';

// Predict website
export const PREDICT_WEBSITE_URL = 'https://predict.olas.network';

// Govern app
export const GOVERN_APP_URL = 'https://govern.olas.network';
