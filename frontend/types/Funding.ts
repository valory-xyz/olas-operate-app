import { MiddlewareChain } from '@/constants';

import { Address } from './Address';

export type TokenBalanceRecord = {
  [tokenAddress: Address]: string;
};

export type MasterSafeBalanceRecord = {
  master_safe: TokenBalanceRecord;
};

export type ServiceSafeBalanceRecord = {
  service_safe: TokenBalanceRecord;
};

export type AddressBalanceRecord = {
  [address: Address]: TokenBalanceRecord;
};

export type BalancesAndFundingRequirements = {
  balances: Partial<{
    [chain in MiddlewareChain]: AddressBalanceRecord;
  }>;
  /**
   * User fund requirements
   * @note this is the amount of funds required during onboarding an agent.
   */
  refill_requirements: Partial<{
    [chain in MiddlewareChain]: AddressBalanceRecord | MasterSafeBalanceRecord;
  }>;
  total_requirements: {
    [chain in MiddlewareChain]: AddressBalanceRecord | MasterSafeBalanceRecord;
  };
  /**
   * Agent funding requirements
   * @note this deals with agent's requirements post onboarding.
   */
  agent_funding_requests: Partial<{
    [chain in MiddlewareChain]: AddressBalanceRecord | ServiceSafeBalanceRecord;
  }>;
  protocol_asset_requirements: Partial<{
    [chain in MiddlewareChain]: TokenBalanceRecord;
  }>;
  bonded_assets: Partial<{
    [chain in MiddlewareChain]: TokenBalanceRecord;
  }>;
  is_refill_required: boolean;
  /**
   * Whether a funding transaction is currently in progress.
   * @note When `true`, `agent_funding_requests` may be temporarily stale until the agent syncs updated balances.
   */
  agent_funding_in_progress: boolean;
  /**
   * Whether the system is in a cooldown window after a funding action.
   * @note When `true`, new funding requests are suppressed and `agent_funding_requests` will be empty until the cooldown ends.
   */
  agent_funding_requests_cooldown: boolean;
  allow_start_agent: boolean;
};
