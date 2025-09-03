import { ethers } from 'ethers';
import { formatEther } from 'ethers/lib/utils';

import { STAKING_PROGRAMS } from '@/config/stakingPrograms';
import { MODE_STAKING_PROGRAMS } from '@/config/stakingPrograms/mode';
import { PROVIDERS } from '@/constants/providers';
import { EvmChainId } from '@/enums/Chain';
import { ModeStakingProgramId, StakingProgramId } from '@/enums/StakingProgram';
import { Address } from '@/types/Address';
import {
  ServiceStakingDetails,
  StakingContractDetails,
  StakingRewardsInfo,
} from '@/types/Autonolas';

import {
  ONE_YEAR,
  StakedAgentService,
} from './shared-services/StakedAgentService';

const REQUESTS_SAFETY_MARGIN = 1;

export abstract class ModiusService extends StakedAgentService {
  static getAgentStakingRewardsInfo = async ({
    agentMultisigAddress,
    serviceId,
    stakingProgramId,
    chainId = EvmChainId.Mode,
  }: {
    agentMultisigAddress: Address;
    serviceId: number;
    stakingProgramId: StakingProgramId;
    chainId?: EvmChainId;
  }): Promise<StakingRewardsInfo | undefined> => {
    if (!agentMultisigAddress) return;
    if (!serviceId) return;
    if (serviceId === -1) return;

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
    const nowInSeconds = Math.floor(Date.now() / 1000);

    const isServiceStaked = serviceInfo[2].length > 0;

    const requiredRequests =
      (Math.ceil(Math.max(livenessPeriod, nowInSeconds - tsCheckpoint)) *
        livenessRatio) /
        1e18 +
      REQUESTS_SAFETY_MARGIN;

    const eligibleRequests = isServiceStaked
      ? currentMultisigNonces[0] - lastMultisigNonces[0]
      : 0;

    const isEligibleForRewards = eligibleRequests >= requiredRequests;

    const availableRewardsForEpoch = Math.max(
      rewardsPerSecond * livenessPeriod, // expected rewards for the epoch
      rewardsPerSecond * (nowInSeconds - tsCheckpoint), // incase of late checkpoint
    );

    // Minimum staked amount is double the minimum staking deposit
    // (all the bonds must be the same as deposit)
    const minimumStakedAmount =
      parseFloat(ethers.utils.formatEther(`${minStakingDeposit}`)) * 2;

    return {
      serviceInfo,
      livenessPeriod,
      livenessRatio,
      rewardsPerSecond,
      isEligibleForRewards,
      availableRewardsForEpoch,
      accruedServiceStakingRewards: parseFloat(
        ethers.utils.formatEther(`${accruedStakingReward}`),
      ),
      minimumStakedAmount,
    } as StakingRewardsInfo;
  };

  static getAvailableRewardsForEpoch = async (
    stakingProgramId: StakingProgramId,
    chainId: EvmChainId = EvmChainId.Mode,
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
    chainId: EvmChainId = EvmChainId.Mode,
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
      minStakingDeposit: parseFloat(
        ethers.utils.formatEther(minStakingDeposit),
      ),
      apy,
      olasStakeRequired,
      rewardsPerWorkPeriod,
      epochCounter: epochCounter.toNumber(),
    };
  };
}
