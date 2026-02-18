import { TokenSymbol } from '@/config/tokens';
import {
  EvmChainId,
  MiddlewareDeploymentStatus,
  StakingProgramId,
  SupportedMiddlewareChain,
} from '@/constants';
import { AgentsFunBaseService } from '@/service/agents/AgentsFunBase';
import { ModiusService } from '@/service/agents/Modius';
import { OptimismService } from '@/service/agents/Optimism';
import { PredictTraderService } from '@/service/agents/PredictTrader';

type ServiceApi =
  | typeof PredictTraderService
  | typeof ModiusService
  | typeof OptimismService
  | typeof AgentsFunBaseService;

type NeedsOpenProfileEachAgentRun = {
  /** Whether the agent requires opening profile first before showing performance metrics */
  needsOpenProfileEachAgentRun: true;
  /** Custom message to show when agent requires to open profile after run */
  needsOpenProfileEachAgentRunAlert: {
    title: string;
    message: string;
  };
};

type DoesNotNeedOpenProfileEachAgentRun = {
  needsOpenProfileEachAgentRun?: undefined;
  needsOpenProfileEachAgentRunAlert?: never;
};

type needsOpenProfileEachAgentRun =
  | NeedsOpenProfileEachAgentRun
  | DoesNotNeedOpenProfileEachAgentRun;

export type AgentConfig = {
  name: string;
  evmHomeChainId: EvmChainId;
  middlewareHomeChainId: SupportedMiddlewareChain;
  agentIds: number[];
  defaultStakingProgramId: StakingProgramId;
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
  /**
   * Enables feature of agents paying for api keys usage
   * instead of asking users to manually provide them
   **/
  isX402Enabled: boolean;
  /**
   * Whether the chat UI requires an API key (either via x402 or agent form)
   */
  doesChatUiRequireApiKey: boolean;
  /** Whether the agent has external funds available (eg. agent invests funds) */
  hasExternalFunds: boolean;
  category?: 'Prediction Markets' | 'DeFi';
  /** Default agent behavior that can be configurable via chat UI
   * Used for agent performance until latest value is provided by agent
   */
  defaultBehavior?: string;
  servicePublicId: string;
  /** Whether the agent is geo-location restricted */
  isGeoLocationRestricted?: boolean;
} & needsOpenProfileEachAgentRun;

type AgentPerformanceMetric = {
  name: string;
  is_primary: boolean;
  value: string;
  description?: string;
};

export type AgentPerformance = {
  timestamp: number | null;
  metrics: AgentPerformanceMetric[];
  last_activity: null;
  agent_behavior: string | null;
};

type DeployedNodes = {
  agent: string[];
  tendermint: string[];
};

type RoundsInfo = Record<
  string,
  {
    name: string;
    description: string;
    transitions: Record<string, string>;
  }
>;

type AgentHealthCheck = {
  agent_health: Record<string, unknown>;
  is_healthy: boolean;
  is_tm_healthy: boolean;
  is_transitioning_fast: boolean;
  period: number;
  reset_pause_duration: number;
  rounds: string[];
  rounds_info?: RoundsInfo;
  seconds_since_last_transition: number;
};

export type ServiceDeployment = {
  status: MiddlewareDeploymentStatus;
  nodes: DeployedNodes;
  healthcheck: AgentHealthCheck;
};
