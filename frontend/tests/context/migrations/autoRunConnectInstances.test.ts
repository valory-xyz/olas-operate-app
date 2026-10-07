import { prepareConnectAutoRunMigration } from '../../../context/migrations/autoRunConnectInstances';
import {
  DEFAULT_SERVICE_CONFIG_ID,
  MOCK_SERVICE_CONFIG_ID_2,
  MOCK_SERVICE_CONFIG_ID_3,
} from '../../helpers/factories';

describe('prepareConnectAutoRunMigration', () => {
  it('appends existing Connect instances to the user-excluded list', () => {
    expect(
      prepareConnectAutoRunMigration(
        { userExcludedAgentInstances: [DEFAULT_SERVICE_CONFIG_ID] },
        [MOCK_SERVICE_CONFIG_ID_2, MOCK_SERVICE_CONFIG_ID_3],
      ),
    ).toEqual({
      userExcludedInstances: [
        DEFAULT_SERVICE_CONFIG_ID,
        MOCK_SERVICE_CONFIG_ID_2,
        MOCK_SERVICE_CONFIG_ID_3,
      ],
      shouldMigrate: true,
    });
  });

  it('does not duplicate a Connect instance already excluded', () => {
    expect(
      prepareConnectAutoRunMigration(
        { userExcludedAgentInstances: [MOCK_SERVICE_CONFIG_ID_2] },
        [MOCK_SERVICE_CONFIG_ID_2],
      ).userExcludedInstances,
    ).toEqual([MOCK_SERVICE_CONFIG_ID_2]);
  });

  it('still migrates (to set the flag) when there is no Connect instance', () => {
    expect(prepareConnectAutoRunMigration(undefined, [])).toEqual({
      userExcludedInstances: [],
      shouldMigrate: true,
    });
  });

  it('changes nothing once the migration has run', () => {
    expect(
      prepareConnectAutoRunMigration(
        {
          connectAutoRunMigrated: true,
          userExcludedAgentInstances: [DEFAULT_SERVICE_CONFIG_ID],
        },
        [MOCK_SERVICE_CONFIG_ID_2],
      ),
    ).toEqual({
      userExcludedInstances: [DEFAULT_SERVICE_CONFIG_ID],
      shouldMigrate: false,
    });
  });
});
