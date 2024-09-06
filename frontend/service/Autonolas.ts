import { BigNumber, ethers } from 'ethers';
import { formatEther } from 'ethers/lib/utils';
import { Contract as MulticallContract } from 'ethers-multicall';

import { AGENT_MECH_ABI } from '@/abis/agentMech';
import { MECH_ACTIVITY_CHECKER_ABI } from '@/abis/mechActivityChecker';
import { SERVICE_REGISTRY_L2_ABI } from '@/abis/serviceRegistryL2';
import { SERVICE_REGISTRY_TOKEN_UTILITY_ABI } from '@/abis/serviceRegistryTokenUtility';
import { SERVICE_STAKING_TOKEN_MECH_USAGE_ABI } from '@/abis/serviceStakingTokenMechUsage';
import { Chain } from '@/client';
import {
  AGENT_MECH_CONTRACT_ADDRESS,
  MECH_ACTIVITY_CHECKER_CONTRACT_ADDRESS,
  SERVICE_REGISTRY_L2_CONTRACT_ADDRESS,
  SERVICE_REGISTRY_TOKEN_UTILITY_CONTRACT_ADDRESS,
  SERVICE_STAKING_TOKEN_MECH_USAGE_CONTRACT_ADDRESSES,
} from '@/constants/contractAddresses';
import { gnosisMulticallProvider } from '@/constants/providers';
import { ServiceRegistryL2ServiceState } from '@/enums/ServiceRegistryL2ServiceState';
import { StakingProgram } from '@/enums/StakingProgram';
import { Address } from '@/types/Address';
import { StakingContractInfo, StakingRewardsInfo } from '@/types/Autonolas';

const ONE_YEAR = 1 * 24 * 60 * 60 * 365;
const REQUIRED_MECH_REQUESTS_SAFETY_MARGIN = 1;

const agentMechContract = new MulticallContract(
  AGENT_MECH_CONTRACT_ADDRESS[Chain.GNOSIS],
  AGENT_MECH_ABI.filter((abi) => abi.type === 'function'), // weird bug in the package where their filter doesn't work..
);

const ServiceStakingTokenAbi = SERVICE_STAKING_TOKEN_MECH_USAGE_ABI.filter(
  (abi) => abi.type === 'function',
);

const serviceStakingTokenMechUsageContracts: Record<
  StakingProgram,
  MulticallContract
> = {
  [StakingProgram.Alpha]: new MulticallContract(
    SERVICE_STAKING_TOKEN_MECH_USAGE_CONTRACT_ADDRESSES[Chain.GNOSIS][
      StakingProgram.Alpha
    ],
    ServiceStakingTokenAbi,
  ),
  [StakingProgram.Beta]: new MulticallContract(
    SERVICE_STAKING_TOKEN_MECH_USAGE_CONTRACT_ADDRESSES[Chain.GNOSIS][
      StakingProgram.Beta
    ],
    ServiceStakingTokenAbi,
  ),
  [StakingProgram.Beta2]: new MulticallContract(
    SERVICE_STAKING_TOKEN_MECH_USAGE_CONTRACT_ADDRESSES[Chain.GNOSIS][
      StakingProgram.Beta2
    ],
    ServiceStakingTokenAbi,
  ),
};

const serviceRegistryTokenUtilityContract = new MulticallContract(
  SERVICE_REGISTRY_TOKEN_UTILITY_CONTRACT_ADDRESS[Chain.GNOSIS],
  SERVICE_REGISTRY_TOKEN_UTILITY_ABI.filter((abi) => abi.type === 'function'), // same as above
);

const serviceRegistryL2Contract = new MulticallContract(
  SERVICE_REGISTRY_L2_CONTRACT_ADDRESS[Chain.GNOSIS],
  SERVICE_REGISTRY_L2_ABI.filter((abi) => abi.type === 'function'), // same as above
);

const mechActivityCheckerContract = new MulticallContract(
  MECH_ACTIVITY_CHECKER_CONTRACT_ADDRESS[Chain.GNOSIS],
  MECH_ACTIVITY_CHECKER_ABI.filter((abi) => abi.type === 'function'), // same as above
);

const getAgentStakingRewardsInfo = async ({
  agentMultisigAddress,
  serviceId,
  stakingProgram,
}: {
  agentMultisigAddress: Address;
  serviceId: number;
  stakingProgram: StakingProgram;
}): Promise<StakingRewardsInfo | undefined> => {
  if (!agentMultisigAddress) return;
  if (!serviceId) return;

  const contractCalls = [
    agentMechContract.getRequestsCount(agentMultisigAddress),
    serviceStakingTokenMechUsageContracts[stakingProgram].getServiceInfo(
      serviceId,
    ),
    serviceStakingTokenMechUsageContracts[stakingProgram].livenessPeriod(),
    mechActivityCheckerContract.livenessRatio(),
    serviceStakingTokenMechUsageContracts[stakingProgram].rewardsPerSecond(),
    serviceStakingTokenMechUsageContracts[
      stakingProgram
    ].calculateStakingReward(serviceId),
    serviceStakingTokenMechUsageContracts[stakingProgram].minStakingDeposit(),
    serviceStakingTokenMechUsageContracts[stakingProgram].tsCheckpoint(),
  ];

  await gnosisMulticallProvider.init();

  const multicallResponse = await gnosisMulticallProvider.all(contractCalls);

  const [
    mechRequestCount,
    serviceInfo,
    livenessPeriod,
    livenessRatio,
    rewardsPerSecond,
    accruedStakingReward,
    minStakingDeposit,
    tsCheckpoint,
  ] = multicallResponse;

  /**
   * struct ServiceInfo {
    // Service multisig address
    address multisig;
    // Service owner
    address owner;
    // Service multisig nonces
    uint256[] nonces; <-- (we use this in the rewards eligibility check)
    // Staking start time
    uint256 tsStart;
    // Accumulated service staking reward
    uint256 reward;
    // Accumulated inactivity that might lead to the service eviction
    uint256 inactivity;}
   */

  const nowInSeconds = Math.floor(Date.now() / 1000);

  const requiredMechRequests =
    (Math.ceil(Math.max(livenessPeriod, nowInSeconds - tsCheckpoint)) *
      livenessRatio) /
      1e18 +
    REQUIRED_MECH_REQUESTS_SAFETY_MARGIN;

  const mechRequestCountOnLastCheckpoint = serviceInfo[2][1];
  const eligibleRequests = mechRequestCount - mechRequestCountOnLastCheckpoint;

  const isEligibleForRewards = eligibleRequests >= requiredMechRequests;

  const availableRewardsForEpoch = Math.max(
    rewardsPerSecond * livenessPeriod, // expected rewards for the epoch
    rewardsPerSecond * (nowInSeconds - tsCheckpoint), // incase of late checkpoint
  );

  // Minimum staked amount is double the minimum staking deposit
  // (all the bonds must be the same as deposit)
  const minimumStakedAmount =
    parseFloat(ethers.utils.formatEther(`${minStakingDeposit}`)) * 2;

  return {
    mechRequestCount,
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

const getAvailableRewardsForEpoch = async (
  stakingProgram: StakingProgram,
): Promise<number | undefined> => {
  const contractCalls = [
    serviceStakingTokenMechUsageContracts[stakingProgram].rewardsPerSecond(),
    serviceStakingTokenMechUsageContracts[stakingProgram].livenessPeriod(), // epoch length
    serviceStakingTokenMechUsageContracts[stakingProgram].tsCheckpoint(), // last checkpoint timestamp
  ];

  await gnosisMulticallProvider.init();

  const multicallResponse = await gnosisMulticallProvider.all(contractCalls);
  const [rewardsPerSecond, livenessPeriod, tsCheckpoint] = multicallResponse;
  const nowInSeconds = Math.floor(Date.now() / 1000);

  return Math.max(
    rewardsPerSecond * livenessPeriod, // expected rewards
    rewardsPerSecond * (nowInSeconds - tsCheckpoint), // incase of late checkpoint
  );
};

const getStakingContractInfoByServiceIdStakingProgram = async (
  serviceId: number,
  stakingProgram: StakingProgram,
): Promise<Partial<StakingContractInfo> | undefined> => {
  if (!serviceId) return;

  const contractCalls = [
    serviceStakingTokenMechUsageContracts[stakingProgram].availableRewards(),
    serviceStakingTokenMechUsageContracts[stakingProgram].maxNumServices(),
    serviceStakingTokenMechUsageContracts[stakingProgram].getServiceIds(),
    serviceStakingTokenMechUsageContracts[stakingProgram].minStakingDuration(),
    serviceStakingTokenMechUsageContracts[stakingProgram].getServiceInfo(
      serviceId,
    ),
    serviceStakingTokenMechUsageContracts[stakingProgram].getStakingState(
      serviceId,
    ),
    serviceStakingTokenMechUsageContracts[stakingProgram].minStakingDeposit(),
  ];

  await gnosisMulticallProvider.init();

  const multicallResponse = await gnosisMulticallProvider.all(contractCalls);
  const [
    availableRewardsInBN,
    maxNumServicesInBN,
    getServiceIdsInBN,
    minStakingDurationInBN,
    serviceInfo,
    serviceStakingState,
    minStakingDeposit,
  ] = multicallResponse;

  const availableRewards = parseFloat(
    ethers.utils.formatUnits(availableRewardsInBN, 18),
  );
  const serviceIds = getServiceIdsInBN.map((id: BigNumber) => id.toNumber());
  const maxNumServices = maxNumServicesInBN.toNumber();

  return {
    availableRewards,
    maxNumServices,
    serviceIds,
    minimumStakingDuration: minStakingDurationInBN.toNumber(),
    serviceStakingStartTime: serviceInfo.tsStart.toNumber(),
    serviceStakingState,
    minStakingDeposit: parseFloat(ethers.utils.formatEther(minStakingDeposit)),
  };
};

/**
 * Get staking contract info by staking program name
 * eg. Alpha, Beta, Beta2
 */
const getStakingContractInfoByStakingProgram = async (
  stakingProgram: StakingProgram,
): Promise<Partial<StakingContractInfo>> => {
  const contractCalls = [
    serviceStakingTokenMechUsageContracts[stakingProgram].availableRewards(),
    serviceStakingTokenMechUsageContracts[stakingProgram].maxNumServices(),
    serviceStakingTokenMechUsageContracts[stakingProgram].getServiceIds(),
    serviceStakingTokenMechUsageContracts[stakingProgram].minStakingDuration(),
    serviceStakingTokenMechUsageContracts[stakingProgram].minStakingDeposit(),
    serviceStakingTokenMechUsageContracts[stakingProgram].rewardsPerSecond(),
    serviceStakingTokenMechUsageContracts[stakingProgram].numAgentInstances(),
    serviceStakingTokenMechUsageContracts[stakingProgram].livenessPeriod(),
  ];

  await gnosisMulticallProvider.init();

  const multicallResponse = await gnosisMulticallProvider.all(contractCalls);
  const [
    availableRewardsInBN,
    maxNumServicesInBN,
    getServiceIdsInBN,
    minStakingDurationInBN,
    minStakingDeposit,
    rewardsPerSecond,
    numAgentInstances,
    livenessPeriod,
  ] = multicallResponse;

  const availableRewards = parseFloat(
    ethers.utils.formatUnits(availableRewardsInBN, 18),
  );
  const serviceIds = getServiceIdsInBN.map((id: BigNumber) => id.toNumber());
  const maxNumServices = maxNumServicesInBN.toNumber();

  // APY
  const rewardsPerYear = rewardsPerSecond.mul(ONE_YEAR);
  const apy =
    Number(rewardsPerYear.mul(100).div(minStakingDeposit)) /
    (1 + numAgentInstances.toNumber());

  // Amount of OLAS required for Stake
  const stakeRequiredInWei = minStakingDeposit.add(
    minStakingDeposit.mul(numAgentInstances),
  );
  const olasStakeRequired = Number(formatEther(stakeRequiredInWei));

  // Rewards per work period
  const rewardsPerWorkPeriod =
    Number(formatEther(rewardsPerSecond as BigNumber)) *
    livenessPeriod.toNumber();

  return {
    availableRewards,
    maxNumServices,
    serviceIds,
    minimumStakingDuration: minStakingDurationInBN.toNumber(),
    minStakingDeposit: parseFloat(ethers.utils.formatEther(minStakingDeposit)),
    apy,
    olasStakeRequired,
    rewardsPerWorkPeriod,
  };
};

const getServiceRegistryInfo = async (
  operatorAddress: Address, // generally masterSafeAddress
  serviceId: number,
): Promise<{
  bondValue: number;
  depositValue: number;
  serviceState: ServiceRegistryL2ServiceState;
}> => {
  const contractCalls = [
    serviceRegistryTokenUtilityContract.getOperatorBalance(
      operatorAddress,
      serviceId,
    ),
    serviceRegistryTokenUtilityContract.mapServiceIdTokenDeposit(serviceId),
    serviceRegistryL2Contract.mapServices(serviceId),
  ];

  await gnosisMulticallProvider.init();

  const [
    operatorBalanceResponse,
    serviceIdTokenDepositResponse,
    mapServicesResponse,
  ] = await gnosisMulticallProvider.all(contractCalls);

  const [bondValue, depositValue, serviceState] = [
    parseFloat(ethers.utils.formatUnits(operatorBalanceResponse, 18)),
    parseFloat(ethers.utils.formatUnits(serviceIdTokenDepositResponse[1], 18)),
    mapServicesResponse.state as ServiceRegistryL2ServiceState,
  ];

  return {
    bondValue,
    depositValue,
    serviceState,
  };
};

const getCurrentStakingProgramByServiceId = async (
  serviceId: number,
): Promise<StakingProgram | null> => {
  if (serviceId <= -1) return null;

  const contractCalls = Object.values(StakingProgram).reduce(
    (acc, stakingProgram: StakingProgram) => ({
      ...acc,
      [stakingProgram]:
        serviceStakingTokenMechUsageContracts[stakingProgram].getStakingState(
          serviceId,
        ),
    }),
    {},
  );

  await gnosisMulticallProvider.init();

  try {
    const [isAlphaStaked, isBetaStaked, isBeta2Staked] =
      await gnosisMulticallProvider.all(Object.values(contractCalls));

    // Alpha should take precedence, as it must be migrated from
    return isAlphaStaked
      ? StakingProgram.Alpha
      : isBetaStaked
        ? StakingProgram.Beta
        : isBeta2Staked
          ? StakingProgram.Beta2
          : null;
  } catch (error) {
    console.error('Error while getting current staking program', error);
    return null;
  }
};

export const AutonolasService = {
  getAgentStakingRewardsInfo,
  getAvailableRewardsForEpoch,
  getCurrentStakingProgramByServiceId,
  getServiceRegistryInfo,
  getStakingContractInfoByServiceIdStakingProgram,
  getStakingContractInfoByStakingProgram,
};
