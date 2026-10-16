/**
 * Switch for a fiat on-ramp. Transak was disabled in v1.6.8 and its integration
 * has since been removed, so nothing reads this flag today. It stays true, and
 * any future card on-ramp must be gated on it: this is the single switch to
 * flip when an on-ramp returns.
 */
export const IS_TRANSAK_UNAVAILABLE = true;
