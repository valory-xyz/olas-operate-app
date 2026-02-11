import { utils } from 'ethers';

const abi = new utils.AbiCoder();

/**
 * Matches: bytes32 constant NAMESPACE = keccak256("Olas");
 */
const NAMESPACE: string = utils.keccak256(utils.toUtf8Bytes('Olas')); // 0x + 64 hex chars

/**
 * Matches:
 * keccak256(abi.encode(NAMESPACE, chainId, serviceRegistryContract, tokenId))
 *
 * NOTE: This is abi.encode (NOT encodePacked), so we use AbiCoder.encode.
 */
export function computeAgentId(params: {
  chainId: number;
  serviceRegistryContract: string; // address
  tokenId: number;
}): string {
  const { chainId, serviceRegistryContract, tokenId } = params;

  const registry = utils.getAddress(serviceRegistryContract); // checksum + validates
  const encoded = abi.encode(
    ['bytes32', 'uint256', 'address', 'uint256'],
    [NAMESPACE, chainId, registry, tokenId],
  );

  return utils.keccak256(encoded); // bytes32 hex string (0x + 64)
}
