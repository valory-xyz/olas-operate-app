import { providers, utils } from 'ethers';
import { Contract as MulticallContract } from 'ethers-multicall';

import { PROVIDERS } from '@/constants/providers';
import { EvmChainId } from '@/enums/Chain';
import { Address } from '@/types/Address';
import { TransactionInfo } from '@/types/TransactionInfo';

/**
 * Returns native balance of the given address
 * @param address
 * @param rpc
 * @returns Promise<number>
 */
const getEthBalance = async (
  address: Address,
  chainId: EvmChainId,
): Promise<number> => {
  try {
    const provider = PROVIDERS[chainId].multicallProvider;

    return provider.getEthBalance(address).then((balance: bigint) => {
      const formattedBalance = utils.formatEther(balance);
      return Number(formattedBalance);
    });
  } catch (e) {
    return Promise.reject('Failed to get ETH balance');
  }
};

/**
 * Returns the ERC20 balance of the given address
 * @param address Address
 * @param rpc string
 * @param contractAddress Address
 * @returns Promise<number>
 */
const getErc20Balance = async (
  address: Address,
  contractAddress: Address,
  chainId: EvmChainId,
): Promise<number> => {
  try {
    if (!contractAddress) {
      throw new Error('Contract address is required for ERC20 balance');
    }

    const provider = PROVIDERS[chainId].multicallProvider;

    const contract = new MulticallContract(contractAddress, [
      'function balanceOf(address) view returns (uint256)',
      'function decimals() view returns (uint8)',
    ]);

    const [balance, decimals] = await provider.all([
      contract.balanceOf(address),
      contract.decimals(),
    ]);

    if (!balance || !decimals) {
      throw new Error('Failed to resolve erc20 balance');
    }

    return Number(utils.formatUnits(balance, decimals));
  } catch (e) {
    return Promise.reject(e);
  }
};

/**
 * Checks if the given RPC is valid
 * @param rpc string
 * @returns Promise<boolean>
 */
const checkRpc = async (chainId: EvmChainId): Promise<boolean> => {
  const provider = PROVIDERS[chainId].provider;
  try {
    if (!provider) throw new Error('Provider is required');

    const networkId = (await provider.getNetwork()).chainId;
    if (!networkId) throw new Error('Failed to get network ID');

    return chainId === networkId;
  } catch (e) {
    return false;
  }
};

// tenderly limits to 1000
const BLOCK_LOOKBACK_WINDOW =
  process.env.NODE_ENV === 'development' ? 1000 : 9000;
const MAX_ROUNDS = 5;

const getLogsList = async (
  contractAddress: Address,
  fromBlock: number,
  toBlock: number,
  roundsLeft: number,
  chainId: EvmChainId,
): Promise<providers.Log[]> => {
  const provider = PROVIDERS[chainId].provider;

  // Limit the number of recursive calls to prevent too many requests
  if (roundsLeft === 0) return [];

  const filter = {
    address: contractAddress,
    fromBlock,
    toBlock,
  };

  const list = await provider.getLogs(filter);

  if (list.length > 0) return list;

  return getLogsList(
    contractAddress,
    fromBlock - BLOCK_LOOKBACK_WINDOW,
    fromBlock,
    roundsLeft - 1,
    chainId,
  );
};

/**
 * Get the latest transaction details for the given address
 */
export const getLatestTransaction = async (
  address: Address,
  chainId: EvmChainId,
): Promise<TransactionInfo | null> => {
  const provider = PROVIDERS[chainId].provider;

  const latestBlock = await provider.getBlockNumber();

  const logs = await getLogsList(
    address,
    latestBlock - BLOCK_LOOKBACK_WINDOW,
    latestBlock,
    MAX_ROUNDS,
    chainId,
  );

  // No transactions found
  if (logs.length === 0) return null;

  // Get the last log entry and fetch the transaction details
  const lastLog = logs[logs.length - 1];
  const txHash = lastLog.transactionHash;
  const receipt = await provider.getTransactionReceipt(txHash);
  const block = await provider.getBlock(receipt.blockNumber);
  const timestamp = block.timestamp;

  return { hash: txHash, timestamp };
};

export const EthersService = {
  getEthBalance,
  getErc20Balance,
  checkRpc,
  getLatestTransaction,
};
