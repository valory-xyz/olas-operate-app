import {
  EvmChainId,
  EvmChainIdMap,
  SupportedMiddlewareChain,
  SupportedMiddlewareChainMap,
} from './chains';

/**
 * Minimum amount in USD required for on-ramping with credit/debit card.
 * MoonPay region-specific minimums (e.g. AMOUNT_TOO_LOW) are surfaced
 * by pearl-api's /api/moonpay/quote response.
 */
export const MIN_ONRAMP_AMOUNT = 5;

export type OnRampChainConfig = {
  chain: EvmChainId;
  /**
   * MoonPay currency code — verified against: https://api.moonpay.com/v3/currencies
   * - 'eth_base' for ETH on Base (network: base, chainId 8453)
   * - 'pol_polygon' for POL on Polygon (network: polygon, chainId 137)
   * Note: 'eth_optimism' is currently `Suspended`; no Gnosis entry exists.
   * Optimism and Gnosis on-ramp via Base + Relay bridge.
   */
  moonpayCurrencyCode: string;
};

/**
 * Map of middleware chains to their on-ramp routing.
 * MoonPay on-ramps land funds on `chain`; Relay then bridges/swaps to the
 * agent's home chain via the existing useSwapFundsStep flow.
 *
 * - Base / Optimism / Gnosis: on-ramp to ETH on Base; Relay handles the rest
 * - Polygon: on-ramp to POL on Polygon directly
 * - Mode: not supported (Modius on-ramp feature flag is disabled)
 */
export const ON_RAMP_CHAIN_MAP: Partial<
  Record<SupportedMiddlewareChain, OnRampChainConfig>
> = {
  [SupportedMiddlewareChainMap.gnosis]: {
    chain: EvmChainIdMap.Base,
    moonpayCurrencyCode: 'eth_base',
  },
  [SupportedMiddlewareChainMap.optimism]: {
    chain: EvmChainIdMap.Base,
    moonpayCurrencyCode: 'eth_base',
  },
  [SupportedMiddlewareChainMap.base]: {
    chain: EvmChainIdMap.Base,
    moonpayCurrencyCode: 'eth_base',
  },
  [SupportedMiddlewareChainMap.polygon]: {
    chain: EvmChainIdMap.Polygon,
    moonpayCurrencyCode: 'pol_polygon',
  },
};
