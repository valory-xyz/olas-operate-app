import { ethers } from 'ethers';
import { formatEther } from 'ethers/lib/utils';

import { STAKING_PROGRAMS } from '@/config/stakingPrograms';
import { BASE_STAKING_PROGRAMS } from '@/config/stakingPrograms/base';
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

const REQUESTS_SAFETY_MARGIN = 1;

const getNowInSeconds = () => Math.floor(Date.now() / 1000);

export abstract class BasiusService extends StakedAgentService {
  static getAgentStakingRewardsInfo = async ({
    agentMultisigAddress,
    serviceId,
    stakingProgramId,
    chainId = EvmChainIdMap.Base,
  }: {
    agentMultisigAddress: Address;
    serviceId: number;
    stakingProgramId: StakingProgramId;
    chainId?: EvmChainId;
  }): Promise<StakingRewardsInfo | undefined> => {
    if (!agentMultisigAddress) return;
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
    const isServiceStaked = lastMultisigNonces.length > 0;

    const secondsSinceCheckpoint = getNowInSeconds() - tsCheckpoint;
    const effectivePeriod = Math.max(livenessPeriod, secondsSinceCheckpoint);
    const requiredRequests =
      (Math.ceil(effectivePeriod) * livenessRatio) / 1e18 +
      REQUESTS_SAFETY_MARGIN;

    const eligibleRequests = isServiceStaked
      ? currentMultisigNonces[0] - lastMultisigNonces[0]
      : 0;

    const isEligibleForRewards = eligibleRequests >= requiredRequests;

    const expectedEpochRewards = rewardsPerSecond * livenessPeriod;
    const lateCheckpointRewards = rewardsPerSecond * secondsSinceCheckpoint;
    const availableRewardsForEpoch = Math.max(
      expectedEpochRewards,
      lateCheckpointRewards,
    );

    const minimumStakedAmount =
      parseFloat(formatEther(`${minStakingDeposit}`)) * 2;

    return {
      serviceInfo,
      livenessPeriod,
      livenessRatio,
      rewardsPerSecond,
      isEligibleForRewards,
      activityThisEpoch: eligibleRequests,
      availableRewardsForEpoch,
      accruedServiceStakingRewards: parseFloat(
        formatEther(`${accruedStakingReward}`),
      ),
      minimumStakedAmount,
      tsCheckpoint,
    } satisfies StakingRewardsInfo;
  };

  static getAvailableRewardsForEpoch = async (
    stakingProgramId: StakingProgramId,
    chainId: EvmChainId = EvmChainIdMap.Base,
  ): Promise<bigint | undefined> => {
    const stakingTokenProxy =
      STAKING_PROGRAMS[chainId][stakingProgramId]?.contract;
    if (!stakingTokenProxy) return;

    const { multicallProvider } = PROVIDERS[chainId];
    const contractCalls = [
      stakingTokenProxy.rewardsPerSecond(),
      stakingTokenProxy.livenessPeriod(),
      stakingTokenProxy.tsCheckpoint(),
    ];
    const multicallResponse = await multicallProvider.all(contractCalls);

    const [rewardsPerSecond, livenessPeriod, tsCheckpoint] = multicallResponse;
    const expectedRewards = rewardsPerSecond * livenessPeriod;
    const lateCheckpointRewards =
      rewardsPerSecond * (getNowInSeconds() - tsCheckpoint);

    return BigInt(Math.max(expectedRewards, lateCheckpointRewards));
  };

  static getServiceStakingDetails = async (
    serviceNftTokenId: number,
    stakingProgramId: StakingProgramId,
    chainId: EvmChainId = EvmChainIdMap.Base,
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

  static getStakingContractDetails = async (
    stakingProgramId: StakingProgramId,
    chainId: EvmChainId,
  ): Promise<StakingContractDetails | undefined> => {
    const { multicallProvider } = PROVIDERS[chainId];

    const stakingTokenProxy = BASE_STAKING_PROGRAMS[stakingProgramId]?.contract;
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
    const serviceIds: number[] = getServiceIdsInBN.map((id: bigint) =>
      Number(id),
    );
    const maxNumServices: number = maxNumServicesInBN.toNumber();

    const rewardsPerYear = rewardsPerSecond.mul(ONE_YEAR);

    let apy = 0;
    if (rewardsPerSecond.gt(0) && minStakingDeposit.gt(0)) {
      const annualPercentage = rewardsPerYear.mul(100).div(minStakingDeposit);
      apy = Number(annualPercentage) / (1 + numAgentInstances.toNumber());
    }

    const stakeRequiredInWei = minStakingDeposit.add(
      minStakingDeposit.mul(numAgentInstances),
    );
    const olasStakeRequired = Number(formatEther(stakeRequiredInWei));

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
