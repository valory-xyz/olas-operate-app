import {
  NativeTokenConfig,
  TOKEN_CONFIG,
  TokenConfig,
  TokenType,
} from '@/config/tokens';
import { EvmChainId } from '@/constants/chains';
import { Address } from '@/types/Address';

const NATIVE_SENTINEL = '0x0000000000000000000000000000000000000000';

const isNativeToken = (config: TokenConfig): config is NativeTokenConfig =>
  config.tokenType === TokenType.NativeGas;

/**
 * Resolve token metadata by address on a given chain.
 *
 * `tokenAddress` semantics from the subgraph:
 *  - `null` or the zero address → the chain's native asset (xDAI, POL, ETH).
 *  - non-zero address → look up in `TOKEN_CONFIG[chainId]`.
 *
 * Returns null when the token isn't known to Pearl (e.g. an unrelated token
 * passed through `MASTER_FUNDING_IN` / `MASTER_WITHDRAWAL`); the caller may
 * render a truncated address as a fallback.
 */
export const resolveToken = (
  chainId: EvmChainId | undefined,
  tokenAddress: Address | null,
): TokenConfig | null => {
  if (!chainId) return null;
  const chainTokens = TOKEN_CONFIG[chainId];
  if (!chainTokens) return null;

  if (tokenAddress == null || tokenAddress.toLowerCase() === NATIVE_SENTINEL) {
    return (
      Object.values(chainTokens).find(
        (cfg): cfg is NativeTokenConfig => !!cfg && isNativeToken(cfg),
      ) ?? null
    );
  }

  const lowered = tokenAddress.toLowerCase();
  return (
    Object.values(chainTokens).find(
      (cfg) => cfg?.address?.toLowerCase() === lowered,
    ) ?? null
  );
};
