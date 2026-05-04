export const ERROR_CODE = {
  INSUFFICIENT_SIGNER_GAS: 'INSUFFICIENT_SIGNER_GAS',
} as const;

export type InsufficientGasErrorBody = {
  error_code: typeof ERROR_CODE.INSUFFICIENT_SIGNER_GAS;
  chain: string;
  // Always a decimal string — backend serialises this way to preserve
  // precision beyond Number.MAX_SAFE_INTEGER (e.g. Polygon's 8×10^18 wei).
  // Accepting a JSON number here would already have lost precision at
  // JSON.parse time, so we reject non-string values defensively.
  prefill_amount_wei: string;
};

export const isInsufficientGasError = (
  value: unknown,
): value is InsufficientGasErrorBody => {
  if (!value || typeof value !== 'object') return false;
  const maybe = value as Record<string, unknown>;
  return (
    maybe.error_code === ERROR_CODE.INSUFFICIENT_SIGNER_GAS &&
    typeof maybe.chain === 'string' &&
    typeof maybe.prefill_amount_wei === 'string'
  );
};
