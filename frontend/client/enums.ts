import { ValueOf } from '@/types/Util';

export enum MiddlewareAction {
  STATUS = 0,
  BUILD = 1,
  DEPLOY = 2,
  STOP = 3,
}

/**
 * @note Use this enum to infer all the middleware chains existing in the system
 * else use the MiddlewareChainType enum for the chains that are supported by the agents and to be strictly typed.
 */
export enum MiddlewareChain {
  ETHEREUM = 'ethereum',
  GOERLI = 'goerli',
  GNOSIS = 'gnosis',
  SOLANA = 'solana',
  OPTIMISM = 'optimism',
  BASE = 'base',
  MODE = 'mode',
  CELO = 'celo',
}

const MIDDLEWARE_CHAINS = {
  gnosis: MiddlewareChain.GNOSIS,
  optimism: MiddlewareChain.OPTIMISM,
  base: MiddlewareChain.BASE,
  mode: MiddlewareChain.MODE,
  celo: MiddlewareChain.CELO,
} as const;
export type MiddlewareChainType = ValueOf<typeof MIDDLEWARE_CHAINS>;

export enum MiddlewareLedger {
  ETHEREUM = 0,
  SOLANA = 1,
}

export enum MiddlewareDeploymentStatus {
  CREATED = 0,
  BUILT = 1,
  DEPLOYING = 2,
  DEPLOYED = 3,
  STOPPING = 4,
  STOPPED = 5,
  DELETED = 6,
}

/** @note statuses where middleware deployment is moving from stopped to deployed, or vice versa, used for loading fallbacks */
export const MiddlewareTransitioningStatuses = [
  MiddlewareDeploymentStatus.DEPLOYING,
  MiddlewareDeploymentStatus.STOPPING,
];

/** @note statuses where middleware deployment is running */
export const MiddlewareRunningStatuses = [
  MiddlewareDeploymentStatus.DEPLOYED,
  ...MiddlewareTransitioningStatuses,
];

/** @note statuses where middleware is in the process of building/creating a new deployment */
export const MiddlewareBuildingStatuses = [
  MiddlewareDeploymentStatus.BUILT,
  MiddlewareDeploymentStatus.CREATED,
];

export enum MiddlewareAccountIsSetup {
  True,
  False,
  Loading,
  Error,
}

export enum EnvProvisionType {
  FIXED = 'fixed',
  USER = 'user',
  COMPUTED = 'computed',
}
