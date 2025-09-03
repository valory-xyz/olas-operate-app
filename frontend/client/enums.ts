import { ValueOf } from '@/types/Util';

/**
 * @note Use this enum to infer all the middleware chains existing in the system
 * else use the SupportedMiddlewareChain enum for the chains that are supported by the agents and to be strictly typed.
 *
 * @warning The value doesn’t actually represent the real chain name;
 * it reflects the open-autonomy internal name instead.
 *
 * @deprecated Use `MiddlewareChain` from '@/constants/chains'.
 */
export enum MiddlewareChain {
  ETHEREUM = 'ethereum',
  GOERLI = 'goerli',
  GNOSIS = 'gnosis',
  SOLANA = 'solana',
  OPTIMISM = 'optimism',
  BASE = 'base',
  MODE = 'mode',
}

/**
 * @deprecated Use `SupportedMiddlewareChainMap` from '@/constants/chains'.
 */
const MIDDLEWARE_CHAINS = {
  gnosis: MiddlewareChain.GNOSIS,
  optimism: MiddlewareChain.OPTIMISM,
  base: MiddlewareChain.BASE,
  mode: MiddlewareChain.MODE,
} as const;

/**
 * @deprecated Use `SupportedMiddlewareChain` from '@/constants/chains'.
 */
export type SupportedMiddlewareChain = ValueOf<typeof MIDDLEWARE_CHAINS>;

/**
 * @deprecated Use `MiddlewareDeploymentStatusMap` from '@/constants/deployment'.
 */
export enum MiddlewareDeploymentStatus {
  CREATED = 0,
  BUILT = 1,
  DEPLOYING = 2,
  DEPLOYED = 3,
  STOPPING = 4,
  STOPPED = 5,
  DELETED = 6,
}
