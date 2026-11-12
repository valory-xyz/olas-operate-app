import { utils } from 'ethers';

import { OLAS_CONTRACTS } from '@/config/olasContracts';
import { CONTRACT_TYPE, EvmChainId } from '@/constants';

const abi = utils.defaultAbiCoder;

/**
 * Matches:
 * keccak256(
 *   abi.encode(
 *     keccak256(bytes(string.concat("eip155:", Strings.toString(chainId)))),
 *     serviceRegistryContract,
 *     tokenId
 *   )
 * )
 *
 * In this implementation:
 * - caip2      = `eip155:${chainId}`
 * - caip2Hash  = keccak256(bytes(caip2))
 * - encoded    = abi.encode(bytes32 caip2Hash, address serviceRegistryContract, uint256 tokenId)
 *
 * NOTE: This is abi.encode (NOT encodePacked), so we use AbiCoder.encode.
 */
export function computeAgentId(chainId: EvmChainId, tokenId: number): string {
  // the registry the app reads the service from, so the id cannot drift from it
  const serviceRegistryContract =
    OLAS_CONTRACTS[chainId]?.[CONTRACT_TYPE.ServiceRegistryL2]?.address;
  if (!serviceRegistryContract) {
    throw new Error(`Unsupported chainId ${chainId} for computeAgentId`);
  }

  const caip2 = `eip155:${chainId}`;
  const caip2Hash = utils.keccak256(utils.toUtf8Bytes(caip2));
  const registry = utils.getAddress(serviceRegistryContract);

  const encoded = abi.encode(
    ['bytes32', 'address', 'uint256'],
    [caip2Hash, registry, tokenId],
  );

  return utils.keccak256(encoded);
}
