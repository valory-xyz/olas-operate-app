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

import { OLAS_CONTRACTS } from '@/config/olasContracts';
import {
  STAKING_PROGRAM_ADDRESS,
  STAKING_PROGRAMS,
} from '@/config/stakingPrograms';
import { PROVIDERS } from '@/constants/providers';
import { ChainId } from '@/enums/Chain';
import { ContractType } from '@/enums/Contract';
import { ServiceRegistryL2ServiceState } from '@/enums/ServiceRegistryL2ServiceState';
import { StakingProgramId } from '@/enums/StakingProgram';
import { Address } from '@/types/Address';
import { Nullable } from '@/types/Util';

export const ONE_YEAR = 1 * 24 * 60 * 60 * 365;

/**
 *
 */
export abstract class StakedAgentService {
  abstract activityCheckerContract: MulticallContract;
  abstract olasStakingTokenProxyContract: MulticallContract;
  abstract serviceRegistryTokenUtilityContract: MulticallContract;

  abstract getStakingRewardsInfo: Promise<unknown>;
  abstract getAvailableRewardsForEpoch: Promise<unknown>;
  abstract getStakingContractInfo: Promise<unknown>;
  abstract getStakingContractInfoByServiceIdStakingProgramId: Promise<unknown>;
  abstract getStakingContractInfoByStakingProgramId: Promise<unknown>;

  static getCurrentStakingProgramByServiceId = async (
    serviceId: number,
    chainId: ChainId,
  ): Promise<StakingProgramId | null> => {
    try {
      const { multicallProvider } = PROVIDERS[chainId];

      // filter out staking programs that are not on the chain
      const stakingProgramEntries = Object.entries(
        STAKING_PROGRAMS[chainId],
      ).filter((entry) => {
        const [, program] = entry;
        return program.chainId === chainId;
      });

      // create contract calls
      const contractCalls = stakingProgramEntries.map((entry) => {
        const [, stakingProgram] = entry;
        return stakingProgram.contract.getStakingState(serviceId);
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
      return stakingProgramEntries[
        activeStakingProgramIndex
      ][0] as StakingProgramId;
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
    chainId: ChainId,
  ): Promise<{
    bondValue: number;
    depositValue: number;
    serviceState: ServiceRegistryL2ServiceState;
  }> => {
    if (!OLAS_CONTRACTS[chainId]) {
      throw new Error('Chain not supported');
    }

    const { serviceRegistryTokenUtilityContract, serviceRegistryL2Contract } =
      OLAS_CONTRACTS[chainId];

    const contractCalls = [
      serviceRegistryTokenUtilityContract.getOperatorBalance(
        address,
        serviceId,
      ),
      serviceRegistryTokenUtilityContract.mapServiceIdTokenDeposit(serviceId),
      serviceRegistryL2Contract.mapServices(serviceId),
    ];

    const [
      getOperatorBalanceReponse,
      mapServiceIdTokenDepositResponse,
      mapServicesResponse,
    ] =
      await OLAS_CONTRACTS[chainId][ContractType.Multicall3].all(contractCalls);

    const [bondValue, depositValue, serviceState] = [
      parseFloat(ethers.utils.formatUnits(getOperatorBalanceReponse, 18)),
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
    chainId: number | ChainId,
    contractAddress: Address,
  ): Nullable<StakingProgramId> => {
    const addresses = STAKING_PROGRAM_ADDRESS[chainId];
    const entries = Object.entries(addresses) as [StakingProgramId, Address][];
    const foundEntry = entries.find(
      ([, address]) => address.toLowerCase() === contractAddress.toLowerCase(),
    );
    return foundEntry ? foundEntry[0] : null;
  };
}
