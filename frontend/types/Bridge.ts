/**
 * Status of the each step in the bridging process.
 * - process: the step is in progress (loading spinner)
 * - wait: the step is waiting for the previous step to finish (grayed out)
 * - finish: the step is finished (checked)
 * - error: the step has failed (red cross)
 */
import { AddressBalanceRecord, MiddlewareChain } from '@/client';

import { Address } from './Address';

export type BridgingStepStatus = 'process' | 'wait' | 'finish' | 'error';

/**
 * Status of the overall quote.
 */
export type QuoteBundleStatus = 'CREATED' | 'QUOTED' | 'SUBMITTED' | 'FINISHED';

/**
 * Execution status of each bridge step.
 * For example, status of bridging ethereum to base.
 * TODO: ask BE what are the other statuses
 */
export type QuoteStatus = 'EXECUTION_PENDING' | 'EXECUTION_DONE' | 'QUOTE_DONE';

export type BridgeFrom = {
  chain: MiddlewareChain;
  address: Address;
  token: Address;
};
export type BridgeTo = BridgeFrom & { amount: bigint };

export type BridgeRefillRequirementsRequest = {
  bridge_requests: {
    from: BridgeFrom;
    to: BridgeTo;
  }[];
  force_update: boolean;
};

export type BridgeRefillRequirementsResponse = {
  id: string;
  balances: {
    [chain in MiddlewareChain]: AddressBalanceRecord;
  };
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

export type QuoteExecution = {
  message: string | null;
  status: QuoteStatus;
  explorer_link?: string;
  tx_hash?: string;
};

// TODO: confirm response format with BE (currently bridge_request_status are called "executions"
// in the status endpoint, ideally to change it)
export type BridgeStatusResponse = {
  id: string;
  status: QuoteBundleStatus;
  bridge_request_status: QuoteExecution[];
  error: boolean;
};
