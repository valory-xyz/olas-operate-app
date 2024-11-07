import { BigNumber, ethers } from 'ethers';
import { formatEther } from 'ethers/lib/utils';
import { Contract as MulticallContract } from 'ethers-multicall';

import { AGENT_MECH_ABI } from '@/abis/agentMech';
import { MECH_ACTIVITY_CHECKER_ABI } from '@/abis/mechActivityChecker';
import { MECH_MARKETPLACE_ABI } from '@/abis/mechMarketplace';
import { REQUESTER_ACTIVITY_CHECKER_ABI } from '@/abis/requesterActivityChecker';
import { SERVICE_REGISTRY_L2_ABI } from '@/abis/serviceRegistryL2';
import { SERVICE_REGISTRY_TOKEN_UTILITY_ABI } from '@/abis/serviceRegistryTokenUtility';
import { SERVICE_STAKING_TOKEN_MECH_USAGE_ABI } from '@/abis/serviceStakingTokenMechUsage';
import { Chain } from '@/client';
import {
  AGENT_MECH_CONTRACT_ADDRESS,
  MECH_ACTIVITY_CHECKER_CONTRACT_ADDRESS,
  MECH_MARKETPLACE_CONTRACT_ADDRESS,
  REQUESTER_ACTIVITY_CHECKER_CONTRACT_ADDRESS,
  SERVICE_REGISTRY_L2_CONTRACT_ADDRESS,
  SERVICE_REGISTRY_TOKEN_UTILITY_CONTRACT_ADDRESS,
  SERVICE_STAKING_TOKEN_MECH_USAGE_CONTRACT_ADDRESSES,
} from '@/constants/contractAddresses';
import { gnosisMulticallProvider } from '@/constants/providers';
import { ServiceRegistryL2ServiceState } from '@/enums/ServiceRegistryL2ServiceState';
import { StakingProgramId } from '@/enums/StakingProgram';
import { Address } from '@/types/Address';
import { StakingContractInfo, StakingRewardsInfo } from '@/types/Autonolas';

const ONE_YEAR = 1 * 24 * 60 * 60 * 365;
const REQUIRED_MECH_REQUESTS_SAFETY_MARGIN = 1;

const ServiceStakingTokenAbi = SERVICE_STAKING_TOKEN_MECH_USAGE_ABI.filter(
  (abi) => abi.type === 'function',
);

const serviceStakingTokenMechUsageContracts: Record<
  StakingProgramId,
  MulticallContract
> = Object.values(StakingProgramId).reduce(
  (contracts, programId) => {
    contracts[programId] = new MulticallContract(
      SERVICE_STAKING_TOKEN_MECH_USAGE_CONTRACT_ADDRESSES[Chain.GNOSIS][
        programId
      ],
      ServiceStakingTokenAbi,
    );
    return contracts;
  },
  {} as Record<StakingProgramId, MulticallContract>,
);

const serviceRegistryTokenUtilityContract = new MulticallContract(
  SERVICE_REGISTRY_TOKEN_UTILITY_CONTRACT_ADDRESS[Chain.GNOSIS],
  SERVICE_REGISTRY_TOKEN_UTILITY_ABI.filter((abi) => abi.type === 'function'),
);

const serviceRegistryL2Contract = new MulticallContract(
  SERVICE_REGISTRY_L2_CONTRACT_ADDRESS[Chain.GNOSIS],
  SERVICE_REGISTRY_L2_ABI.filter((abi) => abi.type === 'function'),
);

const agentMechContract = new MulticallContract(
  AGENT_MECH_CONTRACT_ADDRESS[Chain.GNOSIS],
  AGENT_MECH_ABI.filter((abi) => abi.type === 'function'),
);

const agentMechActivityCheckerContract = new MulticallContract(
  MECH_ACTIVITY_CHECKER_CONTRACT_ADDRESS[Chain.GNOSIS],
  MECH_ACTIVITY_CHECKER_ABI.filter((abi) => abi.type === 'function'),
);

const mechMarketplaceContract = new MulticallContract(
  MECH_MARKETPLACE_CONTRACT_ADDRESS[Chain.GNOSIS],
  MECH_MARKETPLACE_ABI.filter((abi) => abi.type === 'function'),
);

const mechMarketplaceActivityCheckerContract = new MulticallContract(
  REQUESTER_ACTIVITY_CHECKER_CONTRACT_ADDRESS[Chain.GNOSIS],
  REQUESTER_ACTIVITY_CHECKER_ABI.filter((abi) => abi.type === 'function'),
);

const getAgentStakingRewardsInfo = async ({
  agentMultisigAddress,
  serviceId,
  stakingProgram,
}: {
  agentMultisigAddress: Address;
  serviceId: number;
  stakingProgram: StakingProgramId;
}): Promise<StakingRewardsInfo | undefined> => {
  if (!agentMultisigAddress) return;
  if (!serviceId) return;

  const mechContract =
    stakingProgram === StakingProgramId.BetaMechMarketplace
      ? mechMarketplaceContract
      : agentMechContract;

  const mechActivityContract =
    stakingProgram === StakingProgramId.BetaMechMarketplace
      ? mechMarketplaceActivityCheckerContract
      : agentMechActivityCheckerContract;

  const contractCalls = [
    mechContract.getRequestsCount(agentMultisigAddress),
    serviceStakingTokenMechUsageContracts[stakingProgram].getServiceInfo(
      serviceId,
    ),
    serviceStakingTokenMechUsageContracts[stakingProgram].livenessPeriod(),
    mechActivityContract.livenessRatio(),
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
  stakingProgramId: StakingProgramId,
): Promise<number | undefined> => {
  const contractCalls = [
    serviceStakingTokenMechUsageContracts[stakingProgramId].rewardsPerSecond(),
    serviceStakingTokenMechUsageContracts[stakingProgramId].livenessPeriod(), // epoch length
    serviceStakingTokenMechUsageContracts[stakingProgramId].tsCheckpoint(), // last checkpoint timestamp
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
  stakingProgramId: StakingProgramId,
): Promise<Partial<StakingContractInfo> | undefined> => {
  if (!serviceId) return;

  const contractCalls = [
    serviceStakingTokenMechUsageContracts[stakingProgramId].availableRewards(),
    serviceStakingTokenMechUsageContracts[stakingProgramId].maxNumServices(),
    serviceStakingTokenMechUsageContracts[stakingProgramId].getServiceIds(),
    serviceStakingTokenMechUsageContracts[
      stakingProgramId
    ].minStakingDuration(),
    serviceStakingTokenMechUsageContracts[stakingProgramId].getServiceInfo(
      serviceId,
    ),
    serviceStakingTokenMechUsageContracts[stakingProgramId].getStakingState(
      serviceId,
    ),
    serviceStakingTokenMechUsageContracts[stakingProgramId].minStakingDeposit(),
    serviceStakingTokenMechUsageContracts[stakingProgramId].epochCounter(),
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
    epochCounter,
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
    epochCounter: epochCounter.toNumber(),
  };
};

/**
 * Get staking contract info by staking program name
 * eg. Alpha, Beta, Beta2
 */
const getStakingContractInfoByStakingProgram = async (
  stakingProgram: StakingProgramId,
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

/**
 * @param serviceId
 * @returns StakingProgram | null (null when not staked)
 */
const getCurrentStakingProgramByServiceId = async (
  serviceId: number,
): Promise<StakingProgramId | null> => {
  if (serviceId <= -1) return null;

  const contractCalls = Object.values(StakingProgramId).reduce(
    (acc, stakingProgramId: StakingProgramId) => ({
      ...acc,
      [stakingProgramId]:
        serviceStakingTokenMechUsageContracts[stakingProgramId].getStakingState(
          serviceId,
        ),
    }),
    {},
  );

  try {
    await gnosisMulticallProvider.init();
    const [
      isAlphaStaked,
      isBetaStaked,
      isBeta2Staked,
      isBeta3Staked,
      isBeta4Staked,
      isBeta5Staked,
      isBetaMechMarketplaceStaked,
    ] = await gnosisMulticallProvider.all(Object.values(contractCalls));

    if (isAlphaStaked) {
      return StakingProgramId.Alpha;
    }

    if (isBetaStaked) {
      return StakingProgramId.Beta;
    }

    if (isBeta2Staked) {
      return StakingProgramId.Beta2;
    }

    if (isBeta3Staked) {
      return StakingProgramId.Beta3;
    }

    if (isBeta4Staked) {
      return StakingProgramId.Beta4;
    }

    if (isBeta5Staked) {
      return StakingProgramId.Beta5;
    }

    if (isBetaMechMarketplaceStaked) {
      return StakingProgramId.BetaMechMarketplace;
    }

    return null;
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
