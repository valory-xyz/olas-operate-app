/**
 * Tests for Connect's `FUND_REQUIREMENTS` env var.
 *
 * Connect parses it at startup and refuses to start on any entry that is not
 * exactly `{ threshold, topup }` with whole wei amounts, so a malformed entry
 * stops every Connect instance on that chain rather than just one alert.
 */

import { MiddlewareChainMap } from '../../../constants';
import {
  CONNECT_FUND_REQUIREMENTS,
  CONNECT_SERVICE_TEMPLATE,
  connectFundRequirementsFor,
} from '../../../constants/serviceTemplates/service/connect';

type Requirement = Record<string, unknown>;

// Read from the value Connect actually receives, not from the constant behind it.
const sent: Record<
  string,
  Record<string, Record<string, Requirement>>
> = JSON.parse(CONNECT_SERVICE_TEMPLATE.env_variables.FUND_REQUIREMENTS.value);

const entries = Object.entries(sent).flatMap(([chain, roles]) =>
  Object.entries(roles).flatMap(([role, assets]) =>
    Object.entries(assets).map(([asset, requirement]) => ({
      chain,
      role: role as 'agent' | 'safe',
      asset,
      requirement,
    })),
  ),
);

describe('CONNECT_FUND_REQUIREMENTS', () => {
  it('gives every asset exactly a threshold and a topup in whole wei', () => {
    expect(entries.length).toBeGreaterThan(0);
    for (const { requirement } of entries) {
      expect(Object.keys(requirement).sort()).toEqual(['threshold', 'topup']);
      expect(requirement.threshold).toMatch(/^\d+$/);
      expect(requirement.topup).toMatch(/^\d+$/);
    }
  });

  it('tops up to the initial funding amount in the template configurations', () => {
    for (const { chain, role, asset, requirement } of entries) {
      const initial =
        CONNECT_SERVICE_TEMPLATE.configurations[
          chain as keyof typeof CONNECT_SERVICE_TEMPLATE.configurations
        ]?.fund_requirements[asset as `0x${string}`]?.[role];
      expect({ chain, role, asset, topup: requirement.topup }).toEqual({
        chain,
        role,
        asset,
        topup: initial,
      });
    }
  });

  it('never sets a threshold above its topup', () => {
    for (const { requirement } of entries) {
      expect(BigInt(requirement.threshold as string)).toBeLessThanOrEqual(
        BigInt(requirement.topup as string),
      );
    }
  });

  it('is the template value and narrows to one chain per instance', () => {
    expect(
      JSON.parse(
        CONNECT_SERVICE_TEMPLATE.env_variables.FUND_REQUIREMENTS.value,
      ),
    ).toEqual(CONNECT_FUND_REQUIREMENTS);
    expect(
      JSON.parse(connectFundRequirementsFor(MiddlewareChainMap.GNOSIS)),
    ).toEqual({
      [MiddlewareChainMap.GNOSIS]:
        CONNECT_FUND_REQUIREMENTS[MiddlewareChainMap.GNOSIS],
    });
  });
});
