import { SupportedMiddlewareChain } from '@/client';
import { EvmChainId } from '@/enums/Chain';
import { TokenSymbol } from '@/enums/Token';
import { AgentsFunBaseService } from '@/service/agents/AgentsFunBase';
import { ModiusService } from '@/service/agents/Modius';
import { OptimismService } from '@/service/agents/Optimism';
import { PredictTraderService } from '@/service/agents/PredictTrader';

export type AgentConfig = {
  name: string;
  evmHomeChainId: EvmChainId;
  middlewareHomeChainId: SupportedMiddlewareChain;
  requiresAgentSafesOn: EvmChainId[];
  requiresMasterSafesOn: EvmChainId[];
  additionalRequirements?: Partial<
    Record<EvmChainId, Partial<Record<TokenSymbol, number>>>
  >;
  serviceApi:
    | typeof PredictTraderService
    | typeof ModiusService
    | typeof OptimismService
    | typeof AgentsFunBaseService;
  displayName: string;
  description: string;
  /** Adds under construction tab above card */
  isUnderConstruction?: boolean;
  /** Whether the agent is enabled and can be shown in the UI */
  isAgentEnabled: boolean;
  /** If agent is enabled but not yet available to use */
  isComingSoon?: boolean;
  /**
   * Whether the agent requires setup before it can be used.
   * (e.g. Persona for agentsFun)
   */
  requiresSetup: boolean;
  /** Whether the agent has external funds available (eg. agent invests funds) */
  hasExternalFunds: boolean;
};

export type AgentHealthCheckResponse = {
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
