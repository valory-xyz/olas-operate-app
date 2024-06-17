import { ethers } from 'ethers';
import { Contract as MulticallContract } from 'ethers-multicall';

import {
  AGENT_MECH_ABI,
  MECH_ACTIVITY_CHECKER_ABI,
  SERVICE_REGISTRY_L2_ABI,
  SERVICE_REGISTRY_TOKEN_UTILITY_ABI,
  SERVICE_STAKING_TOKEN_MECH_USAGE_ABI,
} from '@/abi';
import { Chain } from '@/client';
import {
  AGENT_MECH_CONTRACT_ADDRESS,
  MECH_ACTIVITY_CHECKER_CONTRACT_ADDRESS,
  SERVICE_REGISTRY_L2_CONTRACT_ADDRESS,
  SERVICE_REGISTRY_TOKEN_UTILITY_CONTRACT_ADDRESS,
  SERVICE_STAKING_TOKEN_MECH_USAGE_CONTRACT_ADDRESS,
} from '@/constants';
import { gnosisMulticallProvider } from '@/constants/providers';
import { ServiceRegistryL2ServiceState } from '@/enums';
import { Address, StakingRewardsInfo } from '@/types';

const REQUIRED_MECH_REQUESTS_SAFETY_MARGIN = 1;

const agentMechContract = new MulticallContract(
  AGENT_MECH_CONTRACT_ADDRESS[Chain.GNOSIS],
  AGENT_MECH_ABI.filter((abi) => abi.type === 'function'), // weird bug in the package where their filter doesn't work..
);

const serviceStakingTokenMechUsageContract = new MulticallContract(
  SERVICE_STAKING_TOKEN_MECH_USAGE_CONTRACT_ADDRESS[Chain.GNOSIS],
  SERVICE_STAKING_TOKEN_MECH_USAGE_ABI.filter((abi) => abi.type === 'function'), // same as above
);

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
}: {
  agentMultisigAddress: Address;
  serviceId: number;
}): Promise<StakingRewardsInfo | undefined> => {
  if (!agentMultisigAddress) return;
  if (!serviceId) return;

  const contractCalls = [
    agentMechContract.getRequestsCount(agentMultisigAddress),
    serviceStakingTokenMechUsageContract.getServiceInfo(serviceId),
    serviceStakingTokenMechUsageContract.livenessPeriod(),
    mechActivityCheckerContract.livenessRatio(),
    serviceStakingTokenMechUsageContract.rewardsPerSecond(),
    serviceStakingTokenMechUsageContract.calculateStakingReward(serviceId),
    serviceStakingTokenMechUsageContract.minStakingDeposit(),
    serviceStakingTokenMechUsageContract.tsCheckpoint(),
  ];

  await gnosisMulticallProvider.init();

  const multicallResponse = await gnosisMulticallProvider.all(contractCalls);

  const [
    mechRequestCount,
    serviceInfo,
    livenessPeriod,
    livenessRatio,
    rewardsPerSecond,
    accruedServiceStakingRewards,
    minimumStakingDeposit,
    lastTsCheckpoint,
  ] = multicallResponse;

  console.log('multicallResponse', multicallResponse);

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

  const requiredMechRequests =
    (Math.ceil(
      Math.max(
        livenessPeriod,
        Math.round(Date.now() / 1000) - lastTsCheckpoint,
      ),
    ) *
      livenessRatio) /
      1e18 +
    REQUIRED_MECH_REQUESTS_SAFETY_MARGIN;

  const mechRequestCountOnLastCheckpoint = serviceInfo[2][1];
  const eligibleRequests = mechRequestCount - mechRequestCountOnLastCheckpoint;

  const isEligibleForRewards = eligibleRequests >= requiredMechRequests;

  const availableRewardsForEpoch = rewardsPerSecond * livenessPeriod;

  // Minimum staked amount is double the minimum staking deposit
  // (basically all the bonds must be the same as deposit)
  const minimumStakedAmount =
    parseFloat(ethers.utils.formatEther(`${minimumStakingDeposit}`)) * 2;

  return {
    mechRequestCount,
    serviceInfo,
    livenessPeriod,
    livenessRatio,
    rewardsPerSecond,
    isEligibleForRewards,
    availableRewardsForEpoch,
    accruedServiceStakingRewards: parseFloat(
      ethers.utils.formatEther(`${accruedServiceStakingRewards}`),
    ),
    minimumStakedAmount,
  } as StakingRewardsInfo;
};

const getAvailableRewardsForEpoch = async (): Promise<number | undefined> => {
  const contractCalls = [
    serviceStakingTokenMechUsageContract.rewardsPerSecond(),
    serviceStakingTokenMechUsageContract.livenessPeriod(),
  ];

  await gnosisMulticallProvider.init();

  const multicallResponse = await gnosisMulticallProvider.all(contractCalls);

  const [rewardsPerSecond, livenessPeriod] = multicallResponse;

  return rewardsPerSecond * livenessPeriod;
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

export const AutonolasService = {
  getAgentStakingRewardsInfo,
  getAvailableRewardsForEpoch,
  getServiceRegistryInfo,
};
