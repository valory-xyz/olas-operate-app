import { ContractInterface, ethers, providers, utils } from 'ethers';

import {
  baseProvider,
  ethereumProvider,
  optimismProvider,
} from '@/constants/providers';
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
  rpc: string,
): Promise<number> => {
  try {
    const provider = new providers.StaticJsonRpcProvider(rpc, {
      name: 'Gnosis',
      chainId: 100, // we currently only support Gnosis Trader agent
    });
    return provider.getBalance(address).then((balance) => {
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
  rpc: string,
  contractAddress?: Address,
): Promise<number> => {
  try {
    if (!contractAddress) {
      throw new Error('Contract address is required for ERC20 balance');
    }

    const provider = new providers.StaticJsonRpcProvider(rpc, {
      name: 'Gnosis',
      chainId: 100, // we currently only support Gnosis Trader agent
    });
    const contract = new ethers.Contract(
      contractAddress,
      [
        'function balanceOf(address) view returns (uint256)',
        'function decimals() view returns (uint8)',
      ],
      provider,
    );
    const [balance, decimals] = await Promise.all([
      contract.balanceOf(address),
      contract.decimals(),
    ]);

    if (!balance || !decimals) {
      throw new Error('Failed to resolve balance or decimals');
    }

    return Number(utils.formatUnits(balance, decimals));
  } catch (e) {
    return Promise.reject(e);
  }
};

/**
 * Returns the Optimism balance of the given address
 */
const getOptimismBalance = async (address: Address): Promise<number> => {
  try {
    return optimismProvider.getBalance(address).then((balance) => {
      const formattedBalance = utils.formatEther(balance);
      return Number(formattedBalance);
    });
  } catch (e) {
    return Promise.reject('Failed to get Optimism balance');
  }
};

/**
 * Returns the Ethereum balance of the given address
 */
const getEthereumBalance = async (address: Address): Promise<number> => {
  try {
    return ethereumProvider.getBalance(address).then((balance) => {
      const formattedBalance = utils.formatEther(balance);
      return Number(formattedBalance);
    });
  } catch (e) {
    return Promise.reject('Failed to get Ethereum balance');
  }
};

/**
 * Returns the base balance of the given address
 */
const getBaseBalance = async (address: Address): Promise<number> => {
  try {
    return baseProvider.getBalance(address).then((balance) => {
      const formattedBalance = utils.formatEther(balance);
      return Number(formattedBalance);
    });
  } catch (e) {
    return Promise.reject('Failed to get base balance');
  }
};

/**
 * Checks if the given RPC is valid
 * @param rpc string
 * @returns Promise<boolean>
 */
const checkRpc = async (rpc: string): Promise<boolean> => {
  try {
    if (!rpc) throw new Error('RPC is required');

    const networkId = (await optimismProvider.getNetwork()).chainId;
    if (!networkId) throw new Error('Failed to get network ID');

    return Promise.resolve(true);
  } catch (e) {
    return Promise.resolve(false);
  }
};

// tenderly limits to 1000
const BACK_TRACK_BLOCKS = process.env.NODE_ENV === 'development' ? 1000 : 9000;
const MAX_ROUNDS = 5;

const getLogsList = async (
  contractAddress: Address,
  fromBlock: number,
  toBlock: number,
  roundsLeft: number,
): Promise<providers.Log[]> => {
  // Limit the number of recursive calls to prevent too many requests
  if (roundsLeft === 0) return [];

  const filter = {
    address: contractAddress,
    fromBlock,
    toBlock,
  };
  const list = await optimismProvider.getLogs(filter);

  if (list.length > 0) return list;

  return getLogsList(
    contractAddress,
    fromBlock - BACK_TRACK_BLOCKS,
    fromBlock,
    roundsLeft - 1,
  );
};

/**
 * Get the latest transaction details for the given contract address
 */
export const getLatestTransaction = async (
  contractAddress: Address,
): Promise<TransactionInfo | null> => {
  const latestBlock = await optimismProvider.getBlockNumber();

  const logs = await getLogsList(
    contractAddress,
    latestBlock - BACK_TRACK_BLOCKS,
    latestBlock,
    MAX_ROUNDS,
  );

  // No transactions found
  if (logs.length === 0) return null;

  // Get the last log entry and fetch the transaction details
  const lastLog = logs[logs.length - 1];
  const txHash = lastLog.transactionHash;
  const receipt = await optimismProvider.getTransactionReceipt(txHash);
  const block = await optimismProvider.getBlock(receipt.blockNumber);
  const timestamp = block.timestamp;

  return { hash: txHash, timestamp };
};

const readContract = ({
  address,
  abi,
}: {
  address: string;
  abi: ContractInterface;
}) => {
  const contract = new ethers.Contract(address, abi, optimismProvider);
  return contract;
};

export const EthersService = {
  getEthBalance, // gnosis
  getErc20Balance,
  checkRpc,
  readContract,
  getLatestTransaction,
  getOptimismBalance,
  getEthereumBalance,
  getBaseBalance,
};
