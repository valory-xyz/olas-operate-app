import {
  EvmChainId,
  EvmChainIdMap,
  SupportedMiddlewareChain,
  SupportedMiddlewareChainMap,
} from './chains';

/**
 * Minimum amount in USD required for on-ramping with credit/debit card
 */
export const MIN_ONRAMP_AMOUNT = 5;

/**
 * Transak on-ramp is temporarily unavailable.
 * Set to false to re-enable on-ramping when Transak is restored.
 */
export const IS_TRANSAK_UNAVAILABLE = true;

/**
 * Map of middleware chains to EVM chain IDs for on-ramp purposes.
 * For example, If the agent is on Gnosis, the on-ramp will be done on Optimism.
 */
export const ON_RAMP_CHAIN_MAP: Record<
  SupportedMiddlewareChain,
  { chain: EvmChainId; cryptoCurrency: 'ETH' | 'POL' }
> = {
  [SupportedMiddlewareChainMap.gnosis]: {
    chain: EvmChainIdMap.Base,
    cryptoCurrency: 'ETH',
  },
  [SupportedMiddlewareChainMap.optimism]: {
    chain: EvmChainIdMap.Optimism,
    cryptoCurrency: 'ETH',
  },
  [SupportedMiddlewareChainMap.base]: {
    chain: EvmChainIdMap.Base,
    cryptoCurrency: 'ETH',
  },
  [SupportedMiddlewareChainMap.mode]: {
    chain: EvmChainIdMap.Optimism,
    cryptoCurrency: 'ETH',
  },
  [SupportedMiddlewareChainMap.polygon]: {
    chain: EvmChainIdMap.Polygon,
    cryptoCurrency: 'POL',
  },
  // Robinhood has no fiat ramp: like Gnosis and Mode, ETH is bought on an
  // on-ramp chain and bridged. The on-ramp only ever buys the native token,
  // so USDG (Transak lists it on Ethereum only) is a bridge-only asset.
  //
  // TODO(robinhood): this entry is inert while `IS_TRANSAK_UNAVAILABLE` is
  // true, and cannot be used as-is when Transak returns. Connect on Robinhood
  // needs 5 USDG, `BASE_TOKEN_CONFIG` has no USDG, so `getFromToken` throws
  // "Failed to get source token for the destination token". Robinhood is the
  // first chain to need both a bridge leg and an ERC20 — Polygon's on-ramp
  // chain is its destination, and Gnosis Connect needs no ERC20 — so the
  // source-token gap has to be closed before re-enabling the ramp here.
  [SupportedMiddlewareChainMap.robinhood]: {
    chain: EvmChainIdMap.Base,
    cryptoCurrency: 'ETH',
  },
};
