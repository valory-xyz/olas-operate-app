/**
 * Shared mock factories for agent service tests (PredictTrader, Modius,
 * Optimism, PettAi, Polystrat, AgentsFun).
 *
 * Each agent test declares `var shared` with the appropriate type and assigns
 * it using these factories. The `var` + getter pattern in jest.mock factories
 * ensures deferred reads — see individual test files for usage.
 */

/** 12-method staking contract mock — identical across all agent services. */
export const createStakingContractMock = () => ({
  getServiceInfo: jest.fn().mockReturnValue('getServiceInfo'),
  livenessPeriod: jest.fn().mockReturnValue('livenessPeriod'),
  rewardsPerSecond: jest.fn().mockReturnValue('rewardsPerSecond'),
  calculateStakingReward: jest.fn().mockReturnValue('calculateStakingReward'),
  minStakingDeposit: jest.fn().mockReturnValue('minStakingDeposit'),
  tsCheckpoint: jest.fn().mockReturnValue('tsCheckpoint'),
  getStakingState: jest.fn().mockReturnValue('getStakingState'),
  availableRewards: jest.fn().mockReturnValue('availableRewards'),
  maxNumServices: jest.fn().mockReturnValue('maxNumServices'),
  getServiceIds: jest.fn().mockReturnValue('getServiceIds'),
  minStakingDuration: jest.fn().mockReturnValue('minStakingDuration'),
  numAgentInstances: jest.fn().mockReturnValue('numAgentInstances'),
  epochCounter: jest.fn().mockReturnValue('epochCounter'),
});

/** Activity checker mock for nonce-based agents (Modius, Optimism, PettAi). */
export const createNonceActivityCheckerMock = () => ({
  livenessRatio: jest.fn().mockReturnValue('livenessRatio'),
  getMultisigNonces: jest.fn().mockReturnValue('getMultisigNonces'),
});

/** Activity checker mock for mech-based agents (PredictTrader, Polystrat). */
export const createMechActivityCheckerMock = () => ({
  livenessRatio: jest.fn().mockReturnValue('livenessRatio'),
});

/** Activity checker mock for AgentsFun (supports both nonce and mech paths). */
export const createAgentsFunActivityCheckerMock = () => ({
  livenessRatio: jest.fn().mockReturnValue('livenessRatio'),
  getMultisigNonces: jest.fn(),
});

/** Mech contract mock for mech-based agents. */
export const createMechContractMock = () => ({
  mapRequestCounts: jest.fn().mockReturnValue('mapRequestCounts'),
  getRequestsCount: jest.fn().mockReturnValue('getRequestsCount'),
});

/** Minimal mech contract mock (mapRequestCounts only, used by AgentsFun). */
export const createMinimalMechContractMock = () => ({
  mapRequestCounts: jest.fn().mockReturnValue('mapRequestCounts'),
});

/**
 * Creates the PROVIDERS mock value for agent service tests.
 * Must be called inside a jest.mock factory with `require()` for EvmChainIdMap.
 *
 * Usage inside jest.mock factory:
 * ```
 * jest.mock('../../../constants/providers', () => {
 *   const { EvmChainIdMap } = require('../../../constants/chains');
 *   const { createProvidersMock } = require('../../mocks/agentServiceMocks');
 *   return { PROVIDERS: createProvidersMock(EvmChainIdMap, shared.multicallAll) };
 * });
 * ```
 */
export const createProvidersMock = (
  chainIdMap: Record<string, number>,
  multicallAll: jest.Mock,
) => {
  const makeProvider = () => ({
    provider: { _isProvider: true },
    multicallProvider: {
      all: (...args: unknown[]) => multicallAll(...args),
    },
  });
  return {
    [chainIdMap.Base]: makeProvider(),
    [chainIdMap.Gnosis]: makeProvider(),
    [chainIdMap.Mode]: makeProvider(),
    [chainIdMap.Optimism]: makeProvider(),
    [chainIdMap.Polygon]: makeProvider(),
  };
};
