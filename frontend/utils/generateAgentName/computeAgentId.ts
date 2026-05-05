import { utils } from 'ethers';

import { EvmChainId, EvmChainIdMap } from '@/constants';

const abi = utils.defaultAbiCoder;

const SERVICE_REGISTRY_ADDRESSES: Record<EvmChainId, string> = {
  [EvmChainIdMap.Base]: '0x3C1fF68f5aa342D296d4DEe4Bb1cACCA912D95fE',
  [EvmChainIdMap.Gnosis]: '0x9338b5153AE39BB89f50468E608eD9d764B755fD',
  [EvmChainIdMap.Mode]: '0x3C1fF68f5aa342D296d4DEe4Bb1cACCA912D95fE',
  [EvmChainIdMap.Optimism]: '0x3d77596beb0f130a4415df3D2D8232B3d3D31e44',
  [EvmChainIdMap.Polygon]: '0xE3607b00E75f6405248323A9417ff6b39B244b50',
} as const;

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
  const serviceRegistryContract = SERVICE_REGISTRY_ADDRESSES[chainId];
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
