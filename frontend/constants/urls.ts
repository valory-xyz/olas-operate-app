import { isDev } from './env';

export const BACKEND_URL: string = `http://localhost:${isDev ? 8000 : 8765}/api`;
export const COW_SWAP_GNOSIS_XDAI_OLAS_URL: string =
  'https://swap.cow.fi/#/100/swap/WXDAI/OLAS';

export const SUPPORT_URL =
  'https://discord.com/channels/899649805582737479/1244588374736502847';
export const FAQ_URL = 'https://olas.network/operate#faq';
