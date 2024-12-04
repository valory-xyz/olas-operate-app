import { ethers } from 'ethers';
import { Contract as MulticallContract, ContractCall } from 'ethers-multicall';

import { ERC20_BALANCE_OF_STRING_FRAGMENT } from '@/abis/erc20';
import { Erc20TokenConfig } from '@/config/tokens';
import { PROVIDERS } from '@/constants/providers';
import { EvmChainId } from '@/enums/Chain';
import { Address } from '@/types/Address';
import { AddressNumberRecord } from '@/types/Records';

/**
 * Gets ETH balances for a list of addresses
 * @param addresses
 * @param rpc
 * @returns Promise<AddressNumberRecord>
 */
const getEthBalances = async (
  addresses: Address[],
  chainId: EvmChainId,
): Promise<AddressNumberRecord | undefined> => {
  const provider = PROVIDERS[chainId].multicallProvider;

  if (addresses.length <= 0) return;

  const callData = addresses.map((address: Address) =>
    provider.getEthBalance(address),
  );

  if (!callData.length) return {};

  const multicallResponse = await provider.all(callData);

  return multicallResponse.reduce(
    (acc: AddressNumberRecord, balance: bigint, index: number) => ({
      ...acc,
      [addresses[index]]: parseFloat(ethers.utils.formatUnits(balance, 18)),
    }),
    {},
  );
};

/**
 * Gets ERC20 balances for a list of addresses
 * @param addresses
 * @param rpc
 * @param erc20TokenConfig
 * @returns Promise<AddressNumberRecord>
 */
const getErc20Balances = async (
  addresses: Address[],
  erc20TokenConfig: Erc20TokenConfig,
  chainId: EvmChainId,
): Promise<AddressNumberRecord> => {
  if (!erc20TokenConfig) return {};
  if (!addresses.length) return {};

  const provider = PROVIDERS[chainId].multicallProvider;

  const callData: ContractCall[] = addresses.map((address: Address) =>
    new MulticallContract(
      erc20TokenConfig.address,
      ERC20_BALANCE_OF_STRING_FRAGMENT,
    )
      .balanceOf(address)
      .then((balance: bigint) =>
        parseFloat(
          ethers.utils.formatUnits(balance, erc20TokenConfig.decimals),
        ),
      ),
  );

  const multicallResponse = await provider.all(callData);

  return multicallResponse.reduce(
    (acc: AddressNumberRecord, parsedBalance: number, index: number) => ({
      ...acc,
      [addresses[index]]: parsedBalance,
    }),
    {},
  );
};

const MulticallService = {
  getEthBalances,
  getErc20Balances,
};

export default MulticallService;
