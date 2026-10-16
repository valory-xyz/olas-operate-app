/**
 * IS_TRANSAK_UNAVAILABLE is the single switch for a fiat on-ramp. It stays true
 * until an on-ramp returns.
 */

import { IS_TRANSAK_UNAVAILABLE } from '../../constants/onramp';

describe('IS_TRANSAK_UNAVAILABLE', () => {
  it('keeps the fiat on-ramp disabled', () => {
    expect(IS_TRANSAK_UNAVAILABLE).toBe(true);
  });
});
