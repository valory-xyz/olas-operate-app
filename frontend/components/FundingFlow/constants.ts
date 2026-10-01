import { FundingRunMode, FundingStepKind } from '@/types/FundingRun';

export const TITLES: Record<
  FundingRunMode,
  { selecting: string; processing: string }
> = {
  onboard: {
    selecting: 'Fund your agent',
    processing: 'Setting up your agent',
  },
  deposit: {
    selecting: 'Deposit funds',
    processing: 'Transferring your funds',
  },
  signer_gas: {
    selecting: 'Deposit funds',
    processing: 'Transferring your funds',
  },
};

export const ACTIVE_RUN_ERROR = "Couldn't check your funding status.";
export const CONNECTION_LOST =
  'Connection lost. Showing the last known status.';
export const NO_DEPOSIT_AMOUNTS =
  'There is nothing to deposit. Go back and enter the amounts first.';
/** A `to_receive` token whose decimals the app does not know. */
export const UNKNOWN_AMOUNT = 'Some';
export const UNKNOWN_TOKEN = 'token';
export const GENERIC_FAILURE = "Couldn't finish the transfer";
/** Shown on a waiting run of this mode that funds another agent or chain. */
export const OTHER_TARGET_RUN = {
  agent: 'This transfer is funding another agent. Cancel it to fund this one.',
  chain: 'This transfer is for another chain. Cancel it to start this one.',
};
export const CANCEL_FAILED =
  "Couldn't cancel: a transfer may still be in progress. Try again in a few minutes.";
export const COPY_FAILED =
  "Couldn't copy the address. Please copy it manually.";

export const SUCCESS_BANNER: Record<FundingRunMode, string> = {
  onboard: 'Your agent is ready!',
  deposit: 'Transfer is done',
  signer_gas: 'Transfer is done',
};

export const SELECT_CHAIN_LABEL =
  'Select the preferred chain to send funds from:';
export const SELECT_CHAIN_FOOTER = 'Select the chain to continue';
export const SELECT_TOKEN_LABEL = 'Select the token:';
export const SELECT_TOKEN_FOOTER = 'Select the token to continue';
export const OTHER_CHAIN = 'Other chain';
export const OTHER_TOKEN = 'Other token';

export const REQUEST_COPY = {
  chain: {
    description:
      'Unfortunately, other chains are not supported at the moment. Please, specify the chain you would like to see in the list.',
    placeholder: 'Enter chain',
    action: 'Request Chain',
  },
  token: {
    description:
      'Unfortunately, other tokens are not supported at the moment. Please, specify the token you would like to see in the list.',
    placeholder: 'Enter token',
    action: 'Request Token',
  },
} as const;

/** Acknowledges receipt only: Pearl does not commit to adding what was asked for. */
export const REQUEST_ACKNOWLEDGEMENT = 'Thank you for your input';
export const REQUEST_FAILED = "Couldn't send your request. Please try again.";

export const QUOTE_COPY = {
  gettingQuote: 'Getting a quote',
  waiting: 'Waiting for your transfer',
  failedTitle: "Couldn't get a quote",
  failedDescription: 'Check your connection and try again.',
} as const;

export const DEPOSIT_INSTRUCTION = (chainName: string) =>
  `Send funds from your external wallet on ${chainName} chain to the wallet address below.`;

export const QR_CAPTION = (tokenSymbol: string, chainName: string) => [
  'Scan to open this address from mobile.',
  `Send ${tokenSymbol} on ${chainName} chain.`,
  'Funds sent on another chain might be lost.',
];

export const SLOW_STEP = 'Taking longer than usual...';
export const FUNDS_SAFE = [
  "Don't worry, your funds remain safe.",
  'Try again or contact support.',
];

type StepCopyArgs = {
  mode: FundingRunMode;
  /** Amount and symbol, e.g. "15.00 USDC"; just the symbol if the amount is unknown. */
  quantity: string;
  symbol: string;
  /** Destination chain display name. */
  chainName: string;
  /** Destination chain native symbol. */
  nativeSymbol: string;
};

type StepCopy = {
  inProgress: (args: StepCopyArgs) => string;
  done: (args: StepCopyArgs) => string;
  failed: (args: StepCopyArgs) => string;
};

/** OLAS is only ever swapped for onboarding to pay for activity rewards. */
const swapInProgress = ({ mode, symbol }: StepCopyArgs) => {
  if (mode !== 'onboard') return `Getting ${symbol}`;
  if (symbol === 'OLAS') return 'Getting OLAS for activity rewards';
  return `Getting ${symbol} for your agent`;
};

/** `null` for the kinds the middleware always sends hidden. */
export const STEP_COPY: Record<FundingStepKind, StepCopy | null> = {
  RECEIVE: {
    inProgress: () => QUOTE_COPY.waiting,
    done: ({ quantity }) => `Received ${quantity}`,
    failed: ({ symbol }) => `Couldn't receive ${symbol}`,
  },
  BRIDGE: {
    inProgress: ({ chainName }) => `Moving funds to ${chainName}`,
    done: ({ quantity, chainName }) => `Moved ${quantity} to ${chainName}`,
    failed: ({ chainName }) => `Couldn't bridge to ${chainName}`,
  },
  NATIVE: {
    inProgress: ({ nativeSymbol }) => `Getting ${nativeSymbol}`,
    done: ({ quantity }) => `Got ${quantity}`,
    failed: ({ nativeSymbol }) => `Couldn't get ${nativeSymbol}`,
  },
  SWAP: {
    inProgress: swapInProgress,
    done: ({ quantity }) => `Got ${quantity}`,
    failed: ({ symbol }) => `Couldn't get ${symbol}`,
  },
  SAFE_AND_TRANSFER: null,
  CLEAR_DELEGATION: null,
};
