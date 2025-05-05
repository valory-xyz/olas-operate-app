import { MiddlewareChain } from '@/client';
import { EvmChainId } from '@/enums/Chain';
import { TokenSymbol } from '@/enums/Token';
import { PredictTraderService } from '@/service/agents/PredictTrader';

export type AgentConfig = {
  name: string;
  evmHomeChainId: EvmChainId;
  middlewareHomeChainId: MiddlewareChain;
  requiresAgentSafesOn: EvmChainId[];
  requiresMasterSafesOn: EvmChainId[];
  additionalRequirements?: Partial<
    Record<EvmChainId, Partial<Record<TokenSymbol, number>>>
  >;
  serviceApi: typeof PredictTraderService;
  displayName: string;
  description: string;
  /** Whether the agent is enabled and can be shown in the UI */
  isAgentEnabled: boolean;
  /** If agent is enabled but not yet available to use */
  isComingSoon?: boolean;
  /**
   * Whether the agent requires setup before it can be used.
   * (e.g. Persona for memeooorr)
   */
  requiresSetup: boolean;
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
