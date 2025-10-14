import { SupportedMiddlewareChain } from '@/client';
import { EvmChainId } from '@/enums/Chain';
import { TokenSymbol } from '@/enums/Token';
import { AgentsFunBaseService } from '@/service/agents/AgentsFunBase';
import { ModiusService } from '@/service/agents/Modius';
import { OptimismService } from '@/service/agents/Optimism';
import { PredictTraderService } from '@/service/agents/PredictTrader';

type ServiceApi =
  | typeof PredictTraderService
  | typeof ModiusService
  | typeof OptimismService
  | typeof AgentsFunBaseService;

export type AgentConfig = {
  name: string;
  evmHomeChainId: EvmChainId;
  middlewareHomeChainId: SupportedMiddlewareChain;
  agentIds: number[];
  requiresAgentSafesOn: EvmChainId[];
  requiresMasterSafesOn: EvmChainId[];
  additionalRequirements?: Partial<
    Record<EvmChainId, Partial<Record<TokenSymbol, number>>>
  >;
  serviceApi: ServiceApi;
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
  hasChatUI: boolean;
  /** Whether the agent has external funds available (eg. agent invests funds) */
  hasExternalFunds: boolean;
  category?: 'Prediction Markets' | 'DeFi';
  /** Default agent behavior that can be configurable via chat UI
   * Used for agent performance until latest value is provided by agent
   */
  defaultBehavior?: string;
  servicePublicId: string;
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
