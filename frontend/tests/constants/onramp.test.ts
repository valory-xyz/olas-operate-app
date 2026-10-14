/**
 * IS_TRANSAK_UNAVAILABLE is the MiCA re-enable gate for a fiat on-ramp. The
 * monthly MiCA on-ramp policy check reads it, so it must stay true until the
 * policy's conditions for a return are met.
 */

import { IS_TRANSAK_UNAVAILABLE } from '../../constants/onramp';

describe('IS_TRANSAK_UNAVAILABLE', () => {
  it('keeps the fiat on-ramp disabled', () => {
    expect(IS_TRANSAK_UNAVAILABLE).toBe(true);
  });
});
