import { ethers } from 'ethers';
import { formatEther } from 'ethers/lib/utils';

import { STAKING_PROGRAMS } from '@/config/stakingPrograms';
import { MODE_STAKING_PROGRAMS } from '@/config/stakingPrograms/mode';
import {
  EvmChainId,
  EvmChainIdMap,
  ModeStakingProgramId,
  PROVIDERS,
  StakingProgramId,
} from '@/constants';
import { Address } from '@/types';
import {
  ServiceStakingDetails,
  StakingContractDetails,
  StakingRewardsInfo,
} from '@/types/Autonolas';
import { isValidServiceId } from '@/utils';

import {
  ONE_YEAR,
  StakedAgentService,
} from './shared-services/StakedAgentService';

const REQUESTS_SAFETY_MARGIN = 1;

const getNowInSeconds = () => Math.floor(Date.now() / 1000);

export abstract class ModiusService extends StakedAgentService {
  static getAgentStakingRewardsInfo = async ({
    agentMultisigAddress,
    serviceId,
    stakingProgramId,
    chainId = EvmChainIdMap.Mode,
  }: {
    agentMultisigAddress: Address;
    serviceId: number;
    stakingProgramId: StakingProgramId;
    chainId?: EvmChainId;
  }): Promise<StakingRewardsInfo | undefined> => {
    if (!agentMultisigAddress) return;
    if (!serviceId) return;
    if (!isValidServiceId(serviceId)) return;

    const stakingProgramConfig = STAKING_PROGRAMS[chainId][stakingProgramId];
    if (!stakingProgramConfig) throw new Error('Staking program not found');

    const { activityChecker, contract: stakingTokenProxyContract } =
      stakingProgramConfig;

    const provider = PROVIDERS[chainId].multicallProvider;

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
    const multicallResponse = await provider.all(contractCalls);

    const [
      serviceInfo,
      livenessPeriod,
      rewardsPerSecond,
      accruedStakingReward,
      minStakingDeposit,
      tsCheckpoint,
      livenessRatio,
      currentMultisigNonces,
    ] = multicallResponse;

    const lastMultisigNonces = serviceInfo[2];

    const isServiceStaked = serviceInfo[2].length > 0;

    // Calculate the number of requests required to be eligible for rewards
    const secondsSinceCheckpoint = getNowInSeconds() - tsCheckpoint;
    const effectivePeriod = Math.max(livenessPeriod, secondsSinceCheckpoint);
    const requiredRequests =
      (Math.ceil(effectivePeriod) * livenessRatio) / 1e18 +
      REQUESTS_SAFETY_MARGIN;

    // Determine how many requests the service has handled since last checkpoint
    const eligibleRequests = isServiceStaked
      ? currentMultisigNonces[0] - lastMultisigNonces[0]
      : 0;

    // Check eligibility for rewards
    const isEligibleForRewards = eligibleRequests >= requiredRequests;

    // Available rewards for the current epoch
    const expectedEpochRewards = rewardsPerSecond * livenessPeriod;
    // in case of late checkpoint
    const lateCheckpointRewards = rewardsPerSecond * secondsSinceCheckpoint;
    const availableRewardsForEpoch = Math.max(
      expectedEpochRewards,
      lateCheckpointRewards,
    );

    // Minimum staked amount is double the minimum staking deposit
    // (all the bonds must be the same as deposit)
    const minimumStakedAmount =
      parseFloat(formatEther(`${minStakingDeposit}`)) * 2;

    return {
      serviceInfo,
      livenessPeriod,
      livenessRatio,
      rewardsPerSecond,
      isEligibleForRewards,
      availableRewardsForEpoch,
      accruedServiceStakingRewards: parseFloat(
        formatEther(`${accruedStakingReward}`),
      ),
      minimumStakedAmount,
      tsCheckpoint,
    } as StakingRewardsInfo;
  };

  static getAvailableRewardsForEpoch = async (
    stakingProgramId: StakingProgramId,
    chainId: EvmChainId = EvmChainIdMap.Mode,
  ): Promise<bigint | undefined> => {
    const stakingTokenProxy =
      STAKING_PROGRAMS[chainId][stakingProgramId]?.contract;
    if (!stakingTokenProxy) return;

    const { multicallProvider } = PROVIDERS[chainId];

    const contractCalls = [
      stakingTokenProxy.rewardsPerSecond(),
      stakingTokenProxy.livenessPeriod(), // epoch length
      stakingTokenProxy.tsCheckpoint(), // last checkpoint timestamp
    ];

    const multicallResponse = await multicallProvider.all(contractCalls);
    const [rewardsPerSecond, livenessPeriod, tsCheckpoint] = multicallResponse;
    const nowInSeconds = Math.floor(Date.now() / 1000);

    return BigInt(
      Math.max(
        rewardsPerSecond * livenessPeriod, // expected rewards
        rewardsPerSecond * (nowInSeconds - tsCheckpoint), // incase of late checkpoint
      ),
    );
  };

  /**
   * Get service details by it's NftTokenId on a provided staking contract
   */
  static getServiceStakingDetails = async (
    serviceNftTokenId: number,
    stakingProgramId: StakingProgramId,
    chainId: EvmChainId = EvmChainIdMap.Mode,
  ): Promise<ServiceStakingDetails> => {
    const { multicallProvider } = PROVIDERS[chainId];

    const { contract: stakingTokenProxy } =
      STAKING_PROGRAMS[chainId][stakingProgramId];

    const contractCalls = [
      stakingTokenProxy.getServiceInfo(serviceNftTokenId),
      stakingTokenProxy.getStakingState(serviceNftTokenId),
    ];

    const multicallResponse = await multicallProvider.all(contractCalls);
    const [serviceInfo, serviceStakingState] = multicallResponse;

    return {
      serviceStakingStartTime: serviceInfo.tsStart.toNumber(),
      serviceStakingState,
    };
  };

  /**
   * Get staking contract info by staking program name
   * eg. Alpha, Beta, Beta2
   */
  static getStakingContractDetails = async (
    stakingProgramId: StakingProgramId,
    chainId: EvmChainId,
  ): Promise<StakingContractDetails | undefined> => {
    const { multicallProvider } = PROVIDERS[chainId];

    const modeStakingProgram =
      MODE_STAKING_PROGRAMS[stakingProgramId as ModeStakingProgramId];
    const stakingTokenProxy = modeStakingProgram?.contract;
    if (!stakingTokenProxy) return;

    const contractCalls = [
      stakingTokenProxy.availableRewards(),
      stakingTokenProxy.maxNumServices(),
      stakingTokenProxy.getServiceIds(),
      stakingTokenProxy.minStakingDuration(),
      stakingTokenProxy.minStakingDeposit(),
      stakingTokenProxy.rewardsPerSecond(),
      stakingTokenProxy.numAgentInstances(),
      stakingTokenProxy.livenessPeriod(),
      stakingTokenProxy.epochCounter(),
    ];

    const multicallResponse = await multicallProvider.all(contractCalls);

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
    ] = multicallResponse;

    const availableRewards = parseFloat(
      ethers.utils.formatUnits(availableRewardsInBN, 18),
    );

    const serviceIds = getServiceIdsInBN.map((id: bigint) => id);
    const maxNumServices = maxNumServicesInBN.toNumber();

    // APY
    const rewardsPerYear = rewardsPerSecond.mul(ONE_YEAR);

    let apy = 0;

    if (rewardsPerSecond.gt(0) && minStakingDeposit.gt(0)) {
      apy =
        Number(rewardsPerYear.mul(100).div(minStakingDeposit)) /
        (1 + numAgentInstances.toNumber());
    }

    // Amount of OLAS required for Stake
    const stakeRequiredInWei = minStakingDeposit.add(
      minStakingDeposit.mul(numAgentInstances),
    );

    const olasStakeRequired = Number(formatEther(stakeRequiredInWei));

    // Rewards per work period
    const rewardsPerWorkPeriod =
      Number(formatEther(rewardsPerSecond as bigint)) *
      livenessPeriod.toNumber();

    return {
      availableRewards,
      maxNumServices,
      serviceIds,
      minimumStakingDuration: minStakingDurationInBN.toNumber(),
      minStakingDeposit: parseFloat(formatEther(minStakingDeposit)),
      apy,
      olasStakeRequired,
      rewardsPerWorkPeriod,
      epochCounter: epochCounter.toNumber(),
      livenessPeriod: livenessPeriod.toNumber(),
    };
  };
}
