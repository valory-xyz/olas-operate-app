import { MiddlewareChain } from '@/client';
import { EvmChainId } from '@/enums/Chain';
import { TokenSymbol } from '@/enums/Token';
import { WalletOwnerType } from '@/enums/Wallet';
import { PredictTraderService } from '@/service/agents/PredictTrader';

export type StakedAgentServiceInstance = PredictTraderService;
export type AgentConfig = {
  name: string;
  evmHomeChainId: EvmChainId;
  middlewareHomeChainId: MiddlewareChain;
  requiresAgentSafesOn: EvmChainId[];
  agentSafeFundingRequirements: Record<string, number>;
  requiresMasterSafesOn: EvmChainId[];
  additionalRequirements?: Partial<
    Record<EvmChainId, Partial<Record<TokenSymbol, number>>>
  >;
  serviceApi: typeof PredictTraderService;
  displayName: string;
  description: string;
  operatingThresholds: {
    [owner: string | WalletOwnerType]: {
      [walletType: string | WalletOwnerType]: {
        [tokenSymbol: string | TokenSymbol]: number;
      };
    };
  };
};

export type AgentHealthCheck = {
  seconds_since_last_transition: number;
  is_tm_healthy: boolean;
  period: number;
  reset_pause_duration: number;
  is_transitioning_fast: boolean;
  rounds: string[];
  rounds_info?: Record<
    string,
    {
      name: string;
      description: string;
      transitions: Record<string, string>;
    }
  >;
};
