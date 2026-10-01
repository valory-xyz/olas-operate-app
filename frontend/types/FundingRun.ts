import { MiddlewareChain } from '@/constants/chains';

import { Address } from './Address';

/**
 * Mirrors the run object returned by every `/api/funding_run` route
 * (`FundingRunManager.run_json` in olas-operate-middleware).
 * Amounts are integer strings in base units; token `0x000…000` is native;
 * timestamps are Unix seconds.
 */

export type FundingRunMode = 'onboard' | 'deposit' | 'signer_gas';

export type FundingRunStatus =
  | 'AWAITING_DEPOSIT'
  | 'QUOTE_FAILED'
  | 'PROCESSING'
  | 'FAILED'
  | 'COMPLETED'
  | 'CANCELLED';

export type FundingStepKind =
  | 'RECEIVE'
  | 'BRIDGE'
  | 'NATIVE'
  | 'SWAP'
  | 'SAFE_AND_TRANSFER'
  | 'CLEAR_DELEGATION';

export type FundingStepStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';

export type FundingRunStep = {
  id: string;
  kind: FundingStepKind;
  status: FundingStepStatus;
  token: Address | null;
  amount: string | null;
  explorer_link: string | null;
  started_at: number | null;
  finished_at: number | null;
  is_slow: boolean;
  visible: boolean;
};

export type FundingRunQuote = {
  required_amount: string;
  received_amount: string;
  outstanding_amount: string;
  quoted_at: number;
  next_refresh_at: number;
};

export type FundingRunTokenAmount = {
  token: Address;
  /** `null` when the middleware can't read an unknown token's on-chain symbol. */
  symbol: string | null;
  amount: string;
};

export type FundingRun = {
  id: string;
  mode: FundingRunMode;
  status: FundingRunStatus;
  source: {
    chain: MiddlewareChain;
    token: Address;
    symbol: string;
    decimals: number;
    deposit_address: Address;
  };
  destination: {
    chain: MiddlewareChain;
    wallet: 'master_safe' | 'master_eoa';
  };
  /** The service an onboarding run funds; `null` in other modes. */
  service_config_id: string | null;
  /** `null` until the first quote lands. */
  quote: FundingRunQuote | null;
  /** Why the last quote failed; set on `QUOTE_FAILED`. */
  quote_message: string | null;
  /** Net delivery: what the user gains after existing balances. Can be empty. */
  to_receive: FundingRunTokenAmount[];
  steps: FundingRunStep[];
  /**
   * Set by the middleware on `FAILED`. Nullable on every status because the
   * response is not validated, so readers must not assume it.
   */
  error: FundingRunError | null;
};

export type FundingRunError = { step_id: string; message: string };

/** Middleware chain → accepted source tokens. */
export type FundingRunSources = Partial<Record<MiddlewareChain, Address[]>>;

type CreateFundingRunBase = {
  source: { chain: MiddlewareChain; token: Address };
  destination: { chain: MiddlewareChain };
};

export type CreateFundingRunRequest = CreateFundingRunBase &
  (
    | { mode: 'onboard'; service_config_id: string; backup_owner?: Address }
    | {
        mode: 'deposit';
        /** Amounts to deliver in base units, keyed by token address. */
        deposit_amounts: Record<Address, string>;
      }
    | { mode: 'signer_gas' }
  );
