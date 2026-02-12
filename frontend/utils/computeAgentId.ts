import { utils } from 'ethers';

const abi = utils.defaultAbiCoder;

/**
 * Matches: bytes32 constant DOMAIN = keccak256("Olas");
 */
const DOMAIN: string = utils.keccak256(utils.toUtf8Bytes('OlasAgentId')); // 0x + 64 hex chars

/**
 * Matches:
 * keccak256(abi.encode(DOMAIN, chainId, serviceRegistryContract, tokenId))
 *
 * NOTE: This is abi.encode (NOT encodePacked), so we use AbiCoder.encode.
 */
export function computeAgentId(params: {
  chainId: number;
  serviceRegistryContract: string;
  tokenId: number;
}): string {
  const { chainId, serviceRegistryContract, tokenId } = params;

  const caip2 = `eip155:${chainId}`;
  const caip2Hash = utils.keccak256(utils.toUtf8Bytes(caip2));
  const registry = utils.getAddress(serviceRegistryContract);

  const encoded = abi.encode(
    ['bytes32', 'bytes32', 'address', 'uint256'],
    [DOMAIN, caip2Hash, registry, tokenId],
  );

  return utils.keccak256(encoded);
}