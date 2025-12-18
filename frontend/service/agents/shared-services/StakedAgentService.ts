/**
 * Generic staked agent service class.
 *
 * This class is intended to be extended by other classes and should not be used directly.
 * It provides static methods and properties specific to staked agents.
 *
 * @note `noop` functions should be replaced with actual implementations in the extending classes.
 * @warning DO NOT STORE STATE IN THESE CLASSES. THEY ARE SINGLETONS AND WILL BE SHARED ACROSS THE APPLICATION.
 */
import { ethers } from 'ethers';
import { Contract as MulticallContract } from 'ethers-multicall';
import { entries } from 'lodash';

import { OLAS_CONTRACTS } from '@/config/olasContracts';
import {
  STAKING_PROGRAMS,
  StakingProgramConfig,
} from '@/config/stakingPrograms';
import {
  CONTRACT_TYPE,
  EvmChainId,
  PROVIDERS,
  ServiceRegistryL2ServiceState,
  StakingProgramId,
} from '@/constants';
import { Address, Maybe, Nullable } from '@/types';
import { areAddressesEqual } from '@/utils';

export const ONE_YEAR = 1 * 24 * 60 * 60 * 365;

export type GetServiceRegistryInfoResponse = {
  bondValue: number;
  depositValue: number;
  serviceState: ServiceRegistryL2ServiceState;
};

/**
 * Staked agent service class.
 */
export abstract class StakedAgentService {
  abstract activityCheckerContract: MulticallContract;
  abstract olasStakingTokenProxyContract: MulticallContract;
  abstract serviceRegistryTokenUtilityContract: MulticallContract;

  abstract getStakingRewardsInfo: Promise<unknown>;
  abstract getAgentStakingRewardsInfo(
    agentMultisigAddress: Address,
    serviceId: number,
    stakingProgramId: StakingProgramId,
    chainId: EvmChainId,
  ): Promise<unknown>;
  abstract getAvailableRewardsForEpoch(
    stakingProgramId: StakingProgramId,
    chainId: EvmChainId,
  ): Promise<unknown>;
  abstract getServiceStakingDetails(
    serviceId: number,
    stakingProgramId: StakingProgramId,
    chainId: EvmChainId,
  ): Promise<unknown>;
  abstract getStakingContractDetails(
    stakingProgramId: StakingProgramId,
    chainId: EvmChainId,
  ): Promise<unknown>;
  abstract getInstance(): StakedAgentService;

  static getCurrentStakingProgramByServiceId = async (
    serviceNftTokenId: number,
    evmChainId: EvmChainId,
  ): Promise<Maybe<StakingProgramId>> => {
    if (!serviceNftTokenId || !evmChainId) return;
    if (serviceNftTokenId <= 0) return;
    try {
      const { multicallProvider } = PROVIDERS[evmChainId];

      // filter out staking programs that are not on the chain
      const stakingProgramEntries = Object.entries(
        STAKING_PROGRAMS[evmChainId],
      ).filter((entry) => {
        const [, program] = entry;
        return program.chainId === evmChainId;
      });

      // create contract calls
      const contractCalls = stakingProgramEntries.map((entry) => {
        const [, stakingProgram] = entry;
        return stakingProgram.contract.getStakingState(serviceNftTokenId);
      });

      // get multicall response
      const multicallResponse = await multicallProvider.all(
        Object.values(contractCalls),
      );

      // find the first staking program that is active
      const activeStakingProgramIndex = multicallResponse.findIndex(Boolean);

      // if no staking program is active, return null
      if (activeStakingProgramIndex === -1) {
        return null;
      }

      // return the staking program id
      const activeStakingProgramId =
        stakingProgramEntries[activeStakingProgramIndex]?.[0];

      return activeStakingProgramId
        ? (activeStakingProgramId as StakingProgramId)
        : null;
    } catch (error) {
      console.error('Error while getting current staking program', error);
      return null;
    }
  };

  /**
   * Gets service registry info, including:
   * - bondValue
   * - depositValue
   * - serviceState
   */
  static getServiceRegistryInfo = async (
    address: Address, // generally masterSafeAddress
    serviceId: number,
    chainId: EvmChainId,
  ): Promise<GetServiceRegistryInfoResponse> => {
    if (!OLAS_CONTRACTS[chainId]) {
      throw new Error('Chain not supported');
    }

    const { multicallProvider } = PROVIDERS[chainId];

    const tokenUtility = CONTRACT_TYPE.ServiceRegistryTokenUtility;
    const {
      [tokenUtility]: serviceRegistryTokenUtilityContract,
      [CONTRACT_TYPE.ServiceRegistryL2]: serviceRegistryL2Contract,
    } = OLAS_CONTRACTS[chainId];

    const contractCalls = [
      serviceRegistryTokenUtilityContract.getOperatorBalance(
        address,
        serviceId,
      ),
      serviceRegistryTokenUtilityContract.mapServiceIdTokenDeposit(serviceId),
      serviceRegistryL2Contract.mapServices(serviceId),
    ];

    const [
      operatorBalanceResponse,
      mapServiceIdTokenDepositResponse,
      mapServicesResponse,
    ] = await multicallProvider.all(contractCalls);

    const [bondValue, depositValue, serviceState] = [
      parseFloat(ethers.utils.formatUnits(operatorBalanceResponse, 18)),
      parseFloat(
        ethers.utils.formatUnits(mapServiceIdTokenDepositResponse[1], 18),
      ),
      mapServicesResponse.state as ServiceRegistryL2ServiceState,
    ];

    return {
      bondValue,
      depositValue,
      serviceState,
    };
  };

  /**
   *
   * Get the staking program id by address
   * @example getStakingProgramIdByAddress('0x3052451e1eAee78e62E169AfdF6288F8791F2918') // StakingProgramId.Beta4
   */
  static getStakingProgramIdByAddress = (
    chainId: EvmChainId,
    contractAddress: Address,
  ): Nullable<StakingProgramId> => {
    const stakingPrograms = STAKING_PROGRAMS[chainId];

    const foundEntry = entries(stakingPrograms).find(([, config]) =>
      areAddressesEqual(config.address, contractAddress),
    ) as [StakingProgramId, StakingProgramConfig] | undefined;

    return foundEntry ? foundEntry[0] : null;
  };
}
