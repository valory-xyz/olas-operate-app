/**
 * Tests for Polystrat's `DISABLE_TRADING` env var.
 *
 * Withdrawal-only mode sets it to "true". It must stay a USER variable:
 * `updateServiceIfNeeded` resets every FIXED variable to the template on each
 * start, which would turn trading back on.
 */

import { AgentMap } from '../../../constants/agent';
import { EnvProvisionMap } from '../../../constants/envVariables';
// Through the barrel, as the app loads it: importing `service/trader` first
// enters the service-template import cycle from the wrong end.
import { SERVICE_TEMPLATES } from '../../../constants/serviceTemplates';

describe('Polystrat template DISABLE_TRADING', () => {
  it('is a USER variable that defaults to "false"', () => {
    const template = SERVICE_TEMPLATES.find(
      ({ agentType }) => agentType === AgentMap.Polystrat,
    );
    expect(template?.env_variables.DISABLE_TRADING).toMatchObject({
      value: 'false',
      provision_type: EnvProvisionMap.USER,
    });
  });
});
