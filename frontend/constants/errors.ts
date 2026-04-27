export const ERROR_CODE = {
  INSUFFICIENT_SIGNER_GAS: 'INSUFFICIENT_SIGNER_GAS',
} as const;

export type InsufficientGasErrorBody = {
  error_code: typeof ERROR_CODE.INSUFFICIENT_SIGNER_GAS;
  chain: string;
  prefill_amount_wei: number | string;
  error?: string;
};

export const isInsufficientGasError = (
  value: unknown,
): value is InsufficientGasErrorBody => {
  if (!value || typeof value !== 'object') return false;
  const maybe = value as Record<string, unknown>;
  return (
    maybe.error_code === ERROR_CODE.INSUFFICIENT_SIGNER_GAS &&
    typeof maybe.chain === 'string' &&
    (typeof maybe.prefill_amount_wei === 'number' ||
      typeof maybe.prefill_amount_wei === 'string')
  );
};
