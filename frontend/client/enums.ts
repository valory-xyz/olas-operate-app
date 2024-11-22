export enum MiddlewareAction {
  STATUS = 0,
  BUILD = 1,
  DEPLOY = 2,
  STOP = 3,
}

export enum MiddlewareChain {
  ETHEREUM = 0,
  GOERLI = 1,
  GNOSIS = 2,
  SOLANA = 3,
  OPTIMISM = 4,
  BASE = 5,
  MODE = 6,
}

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

/** @node statuses where middleware deployment is running */
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
