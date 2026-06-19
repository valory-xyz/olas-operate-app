import { TOKEN_CONFIG, TokenSymbolMap } from '@/config/tokens';
import { EvmChainId } from '@/constants/chains';
import { TWELVE_HOURS_IN_SECONDS } from '@/constants/intervals';
import {
  FUNDS_CATEGORY,
  FundsMovement,
  SubgraphMeta,
} from '@/types/TransactionHistory';

// Staking-reward sweeps surface as OLAS AGENT_TO_MASTER transfers (the agent
// returning reward OLAS to the master). They flood the history and aren't user
// actions, so hide them client-side.
export const isOlasAgentToMaster = (
  movement: FundsMovement,
  chainId: EvmChainId | undefined,
): boolean => {
  if (movement.category !== FUNDS_CATEGORY.AGENT_TO_MASTER) return false;
  const olasAddress =
    chainId &&
    TOKEN_CONFIG[chainId]?.[TokenSymbolMap.OLAS]?.address?.toLowerCase();
  return !!olasAddress && movement.token?.toLowerCase() === olasAddress;
};

// The subgraph can trail the chain head; surface the stale-data warning only
// when the latest indexed block is ≥12h behind wall-clock
export const computeIsDataDelayed = (
  meta: SubgraphMeta | null | undefined,
): boolean => {
  const indexedAt = meta?.block?.timestamp;
  if (!indexedAt) return false;
  const nowSeconds = Math.floor(Date.now() / 1000);
  return nowSeconds - Number(indexedAt) >= TWELVE_HOURS_IN_SECONDS;
};
