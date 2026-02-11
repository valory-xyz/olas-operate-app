import { utils } from 'ethers';

const abi = new utils.AbiCoder();

/**
 * Matches:
 * keccak256(abi.encode(chainId, serviceRegistryContract, tokenId))
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
    ['uint256', 'address', 'uint256'],
    [chainId, registry, tokenId],
  );

  return utils.keccak256(encoded); // bytes32 hex string (0x + 64)
}
