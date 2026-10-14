/**
 * MiCA re-enable gate for a fiat on-ramp. Transak was disabled in v1.6.8 and its
 * integration has since been removed, so nothing reads this flag. It stays as
 * the value the MiCA on-ramp policy checks each month: any return of a card
 * on-ramp must be gated on it, and it must not be set to false for a build EU
 * users can reach until the provider is in the ESMA CASP register or the
 * on-ramp is geo-gated for EU users.
 */
export const IS_TRANSAK_UNAVAILABLE = true;
