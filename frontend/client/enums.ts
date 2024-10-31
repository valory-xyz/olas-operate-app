export enum Action {
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

export enum Ledger {
  ETHEREUM = 0,
  SOLANA = 1,
}

export enum DeploymentStatus {
  CREATED = 0,
  BUILT = 1,
  DEPLOYING = 2,
  DEPLOYED = 3,
  STOPPING = 4,
  STOPPED = 5,
  DELETED = 6,
}

export enum AccountIsSetup {
  True,
  False,
  Loading,
  Error,
}
