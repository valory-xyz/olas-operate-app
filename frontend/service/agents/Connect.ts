import { ethers } from 'ethers';
import { formatEther } from 'ethers/lib/utils';

import { STAKING_PROGRAMS } from '@/config/stakingPrograms';
import {
  EvmChainId,
  EvmChainIdMap,
  PROVIDERS,
  StakingProgramId,
} from '@/constants';
import {
  Address,
  ServiceStakingDetails,
  StakingContractDetails,
  StakingRewardsInfo,
} from '@/types';
import { isValidServiceId } from '@/utils';

import {
  ONE_YEAR,
  StakedAgentService,
} from './shared-services/StakedAgentService';

const getNowInSeconds = () => Math.floor(Date.now() / 1000);

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
    chainId = EvmChainIdMap.Gnosis,
  }: {
    agentMultisigAddress: Address;
    serviceId: number;
    stakingProgramId: StakingProgramId;
    chainId?: EvmChainId;
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

  static getAvailableRewardsForEpoch = async (
    stakingProgramId: StakingProgramId,
    chainId: EvmChainId = EvmChainIdMap.Gnosis,
  ): Promise<bigint | undefined> => {
    const stakingTokenProxy =
      STAKING_PROGRAMS[chainId]?.[stakingProgramId]?.contract;
    if (!stakingTokenProxy) return;

    const [rewardsPerSecond, livenessPeriod, tsCheckpoint] = await PROVIDERS[
      chainId
    ].multicallProvider.all([
      stakingTokenProxy.rewardsPerSecond(),
      stakingTokenProxy.livenessPeriod(),
      stakingTokenProxy.tsCheckpoint(),
    ]);

    return BigInt(
      Math.max(
        rewardsPerSecond * livenessPeriod,
        rewardsPerSecond * (getNowInSeconds() - tsCheckpoint),
      ),
    );
  };

  static getServiceStakingDetails = async (
    serviceNftTokenId: number,
    stakingProgramId: StakingProgramId,
    chainId: EvmChainId = EvmChainIdMap.Gnosis,
  ): Promise<ServiceStakingDetails> => {
    const { contract: stakingTokenProxy } =
      STAKING_PROGRAMS[chainId][stakingProgramId];

    const [serviceInfo, serviceStakingState] = await PROVIDERS[
      chainId
    ].multicallProvider.all([
      stakingTokenProxy.getServiceInfo(serviceNftTokenId),
      stakingTokenProxy.getStakingState(serviceNftTokenId),
    ]);

    return {
      serviceStakingStartTime: serviceInfo.tsStart.toNumber(),
      serviceStakingState,
    };
  };

  static getStakingContractDetails = async (
    stakingProgramId: StakingProgramId,
    chainId: EvmChainId,
  ): Promise<StakingContractDetails | undefined> => {
    const stakingTokenProxy =
      STAKING_PROGRAMS[chainId]?.[stakingProgramId]?.contract;
    if (!stakingTokenProxy) return;

    const [
      availableRewardsInBN,
      maxNumServicesInBN,
      getServiceIdsInBN,
      minStakingDurationInBN,
      minStakingDeposit,
      rewardsPerSecond,
      numAgentInstances,
      livenessPeriod,
      epochCounter,
    ] = await PROVIDERS[chainId].multicallProvider.all([
      stakingTokenProxy.availableRewards(),
      stakingTokenProxy.maxNumServices(),
      stakingTokenProxy.getServiceIds(),
      stakingTokenProxy.minStakingDuration(),
      stakingTokenProxy.minStakingDeposit(),
      stakingTokenProxy.rewardsPerSecond(),
      stakingTokenProxy.numAgentInstances(),
      stakingTokenProxy.livenessPeriod(),
      stakingTokenProxy.epochCounter(),
    ]);

    let apy = 0;
    if (rewardsPerSecond.gt(0) && minStakingDeposit.gt(0)) {
      apy =
        Number(rewardsPerSecond.mul(ONE_YEAR).mul(100).div(minStakingDeposit)) /
        (1 + numAgentInstances.toNumber());
    }

    return {
      availableRewards: parseFloat(
        ethers.utils.formatUnits(availableRewardsInBN, 18),
      ),
      maxNumServices: maxNumServicesInBN.toNumber(),
      serviceIds: getServiceIdsInBN.map((id: bigint) => Number(id)),
      minimumStakingDuration: minStakingDurationInBN.toNumber(),
      minStakingDeposit: parseFloat(formatEther(minStakingDeposit)),
      apy,
      olasStakeRequired: Number(
        formatEther(
          minStakingDeposit.add(minStakingDeposit.mul(numAgentInstances)),
        ),
      ),
      rewardsPerWorkPeriod:
        Number(formatEther(rewardsPerSecond as bigint)) *
        livenessPeriod.toNumber(),
      epochCounter: epochCounter.toNumber(),
      livenessPeriod: livenessPeriod.toNumber(),
    };
  };

  /**
   * `POST /session` (launching the local Claude Code session) is NOT here: the
   * agent's local server enables no CORS, so the renderer cannot call it. The
   * request is made from the Electron main process instead — see
   * `electronApi.connect.startSession` (`useConnectSession`).
   */
}
