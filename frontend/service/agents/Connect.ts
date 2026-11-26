import { formatEther } from 'ethers/lib/utils';

import { STAKING_PROGRAMS } from '@/config/stakingPrograms';
import { EvmChainId, PROVIDERS, StakingProgramId } from '@/constants';
import {
  Address,
  ServiceStakingDetails,
  StakingContractDetails,
  StakingRewardsInfo,
} from '@/types';
import { isValidServiceId } from '@/utils';
import { getNowInSeconds } from '@/utils/time';

import { PredictTraderService } from './PredictTrader';
import { StakedAgentService } from './shared-services/StakedAgentService';

/**
 * Index of the Marketplace request count in both the activity checker's
 * `getMultisigNonces` and the staking contract's `ServiceInfo.nonces`.
 */
const REQUEST_COUNT_INDEX = 1;

/**
 * Connect agent service.
 *
 * Staking is optional and per chain (`AgentConfig.stakingChains`): an instance
 * on `no_staking` never reaches these methods, because the `no_staking` guards
 * in `StakingContractDetailsProvider` / `RewardProvider` short-circuit first.
 * Connect's contracts use a requester activity checker that counts the Agent
 * Safe's settled Marketplace requests on chain; one a day earns the epoch.
 *
 * @warning DO NOT STORE STATE IN THIS CLASS. It is a singleton shared across
 * the application.
 */
export abstract class ConnectService extends StakedAgentService {
  static getAgentStakingRewardsInfo = async ({
    agentMultisigAddress,
    serviceId,
    stakingProgramId,
    chainId,
  }: {
    agentMultisigAddress: Address;
    serviceId: number;
    stakingProgramId: StakingProgramId;
    // required: Connect's program ids repeat across its chains
    chainId: EvmChainId;
  }): Promise<StakingRewardsInfo | undefined> => {
    if (!agentMultisigAddress) return;
    if (!isValidServiceId(serviceId)) return;

    const stakingProgramConfig = STAKING_PROGRAMS[chainId]?.[stakingProgramId];
    if (!stakingProgramConfig) throw new Error('Staking program not found');

    const { activityChecker, contract: stakingTokenProxyContract } =
      stakingProgramConfig;

    const contractCalls = [
      stakingTokenProxyContract.getServiceInfo(serviceId),
      stakingTokenProxyContract.livenessPeriod(),
      stakingTokenProxyContract.rewardsPerSecond(),
      stakingTokenProxyContract.calculateStakingReward(serviceId),
      stakingTokenProxyContract.minStakingDeposit(),
      stakingTokenProxyContract.tsCheckpoint(),
      activityChecker.livenessRatio(),
      activityChecker.getMultisigNonces(agentMultisigAddress),
    ];
    const { reads, isAwaitingBaseline } =
      await StakedAgentService.readWithBaseline(
        PROVIDERS[chainId].multicallProvider,
        stakingProgramConfig,
        serviceId,
        contractCalls,
      );

    const [
      serviceInfo,
      livenessPeriod,
      rewardsPerSecond,
      accruedStakingReward,
      minStakingDeposit,
      tsCheckpoint,
      livenessRatio,
      multisigNonces,
    ] = reads;

    const lastNonces = serviceInfo[2];
    const isServiceStaked = lastNonces.length > REQUEST_COUNT_INDEX;

    const secondsSinceCheckpoint = getNowInSeconds() - tsCheckpoint;
    const effectivePeriod = Math.max(livenessPeriod, secondsSinceCheckpoint);
    // No safety margin, unlike the agents that make their own requests: the
    // user makes exactly one a day, and the contract counts that one.
    const requiredRequests = Math.ceil(
      (effectivePeriod * livenessRatio) / 1e18,
    );

    const eligibleRequests = isServiceStaked
      ? multisigNonces[REQUEST_COUNT_INDEX] - lastNonces[REQUEST_COUNT_INDEX]
      : 0;

    const isEligibleForRewards =
      !isAwaitingBaseline && eligibleRequests >= requiredRequests;

    const availableRewardsForEpoch = Math.max(
      rewardsPerSecond * livenessPeriod,
      rewardsPerSecond * secondsSinceCheckpoint,
    );

    return {
      serviceInfo,
      livenessPeriod,
      livenessRatio,
      rewardsPerSecond,
      isEligibleForRewards,
      isAwaitingBaseline,
      activityThisEpoch: eligibleRequests,
      availableRewardsForEpoch,
      accruedServiceStakingRewards: parseFloat(
        formatEther(`${accruedStakingReward}`),
      ),
      minimumStakedAmount: parseFloat(formatEther(`${minStakingDeposit}`)) * 2,
      tsCheckpoint,
    } satisfies StakingRewardsInfo;
  };

  // Connect's contracts are standard staking proxies, read the same way as
  // Omenstrat's on the instance's own chain.
  static getAvailableRewardsForEpoch = async (
    stakingProgramId: StakingProgramId,
    chainId: EvmChainId,
  ): Promise<bigint | undefined> =>
    PredictTraderService.getAvailableRewardsForEpoch(stakingProgramId, chainId);

  static getServiceStakingDetails = async (
    serviceNftTokenId: number,
    stakingProgramId: StakingProgramId,
    chainId: EvmChainId,
  ): Promise<ServiceStakingDetails> =>
    PredictTraderService.getServiceStakingDetails(
      serviceNftTokenId,
      stakingProgramId,
      chainId,
    );

  static getStakingContractDetails = async (
    stakingProgramId: StakingProgramId,
    chainId: EvmChainId,
  ): Promise<StakingContractDetails | undefined> =>
    PredictTraderService.getStakingContractDetails(stakingProgramId, chainId);

  /**
   * `POST /session` (launching the local Claude Code session) is NOT here: the
   * agent's local server enables no CORS, so the renderer cannot call it. The
   * request is made from the Electron main process instead — see
   * `electronApi.connect.startSession` (`useConnectSession`).
   */
}
