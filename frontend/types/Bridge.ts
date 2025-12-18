import { TokenSymbol } from '@/config/tokens';
import { MiddlewareChain } from '@/constants';

import { Address } from './Address';
import { AddressBalanceRecord } from './Funding';
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
  | 'CREATED'
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

export type BridgeRequest = { from: BridgeFrom; to: BridgeTo };

export type BridgeRefillRequirementsRequest = {
  bridge_requests: BridgeRequest[];
  force_update: boolean;
};

export type BridgeRefillRequirementsResponse = {
  /** quote bundle Id */
  id: string;
  balances: Partial<{
    [chain in MiddlewareChain]: AddressBalanceRecord;
  }>;
  bridge_total_requirements: Partial<{
    [chain in MiddlewareChain]: AddressBalanceRecord;
  }>;
  bridge_refill_requirements: Partial<{
    [chain in MiddlewareChain]: AddressBalanceRecord;
  }>;
  bridge_request_status: {
    message: Nullable<string>;
    status: QuoteStatus;
    eta: number;
  }[];
  expiration_timestamp: number;
  is_refill_required: boolean;
};

type QuoteRequestStatus = {
  explorer_link: Maybe<string>;
  message: Nullable<string>;
  status: QuoteStatus;
  tx_hash?: Maybe<string>;
};

export type BridgeStatusResponse = {
  id: string;
  status: QuoteStatus;
  bridge_request_status: QuoteRequestStatus[];
};

export type TokenTransfer = {
  fromSymbol: TokenSymbol;
  fromAmount: string;
  toSymbol: TokenSymbol;
  toAmount: string;
  decimals?: number;
};

export type CrossChainTransferDetails = {
  fromChain: MiddlewareChain;
  toChain: MiddlewareChain;
  transfers: TokenTransfer[];
  eta?: number;
};

export type BridgeStatuses = {
  symbol: TokenSymbol;
  status: BridgingStepStatus;
  txnLink: Maybe<string>;
}[];

export type ReceivingTokens = {
  amount: number;
  symbol?: TokenSymbol;
}[];
