export enum MiddlewareAction {
  STATUS = 0,
  BUILD = 1,
  DEPLOY = 2,
  STOP = 3,
}

export enum MiddlewareChain {
  ETHEREUM = "ethereum",
  GOERLI = "goerli",
  GNOSIS = "gnosis",
  SOLANA = "solana",
  OPTIMISM = "optimism",
  BASE = "base",
  MODE = "mode",
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

export enum MiddlewareAccountIsSetup {
  True,
  False,
  Loading,
  Error,
}

export enum EnvProvisionType {
  FIXED = "fixed",
  USER = "user",
  COMPUTED = "computed"
}