import { MiddlewareChain } from '@/client';

export const BACKEND_URL: string = `http://localhost:${process.env.NODE_ENV === 'production' ? 8765 : 8000}/api`;

export const BACKEND_URL_V2: string = `http://localhost:${process.env.NODE_ENV === 'production' ? 8765 : 8000}/api/v2`;

export const COW_SWAP_GNOSIS_XDAI_OLAS_URL: string =
  'https://swap.cow.fi/#/100/swap/WXDAI/OLAS';

// olas.network
export const FAQ_URL = 'https://olas.network/operate#faq';
export const DOWNLOAD_URL = 'https://olas.network/operate#download';

// thegraph
export const GNOSIS_REWARDS_HISTORY_SUBGRAPH_URL =
  'https://api.studio.thegraph.com/query/81371/gnosis-pearl-rewards-history/version/latest';

// discord
export const SUPPORT_URL =
  'https://discord.com/channels/899649805582737479/1244588374736502847';
export const DISCORD_TICKET_URL =
  'https://discord.com/channels/899649805582737479/1245674435160178712/1263815577240076308';

// github
export const GITHUB_API_LATEST_RELEASE =
  'https://api.github.com/repos/valory-xyz/olas-operate-app/releases/latest';

// explorers @note DO NOT END WITH `/`
export const OPTIMISM_EXPLORER_URL = 'https://optimistic.etherscan.io';
export const GNOSIS_EXPLORER_URL = 'https://gnosisscan.io';

export const EXPLORER_URL = {
  [MiddlewareChain.OPTIMISM]: OPTIMISM_EXPLORER_URL,
  [MiddlewareChain.GNOSIS]: GNOSIS_EXPLORER_URL,
};
