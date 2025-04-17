import { AddressBalanceRecord, MiddlewareChain } from '@/client';
import { TokenSymbol } from '@/enums/Token';

import { Address } from './Address';
import { Maybe, Nullable } from './Util';

/**
 * Status of the each step in the bridging process.
 * - process: the step is in progress (loading spinner)
 * - wait: the step is waiting for the previous step to finish (grayed out)
 * - finish: the step is finished (checked)
 * - error: the step has failed (red cross)
 */
export type BridgingStepStatus = 'process' | 'wait' | 'finish' | 'error';

/**
 * Status of the overall quote.
 */
export type QuoteBundleStatus = 'CREATED' | 'QUOTED' | 'SUBMITTED' | 'FINISHED';

/**
 * Execution status of each bridge step.
 * For example, status of bridging ethereum to base.
 *
 * QUOTE_DONE: A quote is available.
 * QUOTE_FAILED: Failed to request a quote.
 * EXECUTION_PENDING: Execution submitted and pending to be finalized.
 * EXECUTION_DONE: Execution finalized successfully.
 * EXECUTION_FAILED: Execution failed.
 */
export type QuoteStatus =
  | 'QUOTE_DONE'
  | 'QUOTE_FAILED'
  | 'EXECUTION_PENDING'
  | 'EXECUTION_DONE'
  | 'EXECUTION_FAILED';

type BridgeFrom = {
  chain: MiddlewareChain;
  address: Address;
  token: Address;
};
type BridgeTo = BridgeFrom & { amount: string };

export type BridgeRefillRequirementsRequest = {
  bridge_requests: { from: BridgeFrom; to: BridgeTo }[];
  force_update: boolean;
};

export type BridgeRefillRequirementsResponse = {
  id: string;
  balances: { [chain in MiddlewareChain]: AddressBalanceRecord };
  bridge_total_requirements: {
    [chain in MiddlewareChain]: AddressBalanceRecord;
  };
  bridge_refill_requirements: {
    [chain in MiddlewareChain]: AddressBalanceRecord;
  };
  expiration_timestamp: number;
  is_refill_required: boolean;
  error: boolean;
  bridge_request_status: { message: string; status: QuoteStatus }[];
};

type QuoteRequestStatus = {
  explorer_link: Maybe<string>;
  message: Nullable<string>;
  status: QuoteStatus;
  tx_hash?: Maybe<string>;
};

export type BridgeStatusResponse = {
  id: string;
  status: QuoteBundleStatus;
  bridge_request_status: QuoteRequestStatus[];
  error: boolean;
};

export type TokenTransfer = {
  fromSymbol: TokenSymbol;
  fromAmount: string;
  toSymbol: TokenSymbol;
  toAmount: string;
};

export type CrossChainTransferDetails = {
  fromChain: string;
  toChain: string;
  transfers: TokenTransfer[];
};
