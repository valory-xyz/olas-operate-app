import { renderHook, waitFor } from '@testing-library/react';

import { useOnboardingSurveyTiming } from '../../hooks/useOnboardingSurveyTiming';
import { PearlStore } from '../../types/ElectronApi';
import {
  DEFAULT_SERVICE_CONFIG_ID,
  makeOnboardingSurveyState,
  makePearlStore,
} from '../helpers/factories';

const mockStoreSet = jest.fn();
const mockUseStore = jest.fn();
const mockUseServices = jest.fn();

jest.mock('../../hooks/useElectronApi', () => ({
  useElectronApi: () => ({ store: { set: mockStoreSet } }),
}));
jest.mock('../../hooks/useStore', () => ({ useStore: () => mockUseStore() }));
jest.mock('../../hooks/useServices', () => ({
  useServices: () => mockUseServices(),
}));

/** A service that carries an on-chain NFT token id — i.e. an account that predates the feature. */
const makeDeployedService = () => ({
  service_config_id: DEFAULT_SERVICE_CONFIG_ID,
  home_chain: 'gnosis',
  chain_configs: { gnosis: { chain_data: { token: 42 } } },
});

/**
 * A service that was created but never deployed. The middleware writes `token: -1`
 * (`NON_EXISTENT_TOKEN`) here, not `null`.
 */
const makeUndeployedService = () => ({
  service_config_id: DEFAULT_SERVICE_CONFIG_ID,
  home_chain: 'gnosis',
  chain_configs: { gnosis: { chain_data: { token: -1 } } },
});

type SetupOptions = { services?: unknown[]; isFetched?: boolean };

const setup = (
  storeState: PearlStore | undefined,
  options: SetupOptions = {},
) => {
  // `undefined` is a meaningful value for `services` (nothing was fetched), so it only defaults
  // to an empty list when the key is absent.
  const services = 'services' in options ? options.services : [];
  mockUseStore.mockReturnValue({ storeState });
  mockUseServices.mockReturnValue({
    services,
    isFetched: options.isFetched ?? true,
  });
  return renderHook(() => useOnboardingSurveyTiming());
};

const classification = () =>
  mockStoreSet.mock.calls.find(
    ([key]: [string]) => key === 'onboardingSurvey.timingUnavailable',
  );

beforeEach(() => jest.clearAllMocks());

describe('useOnboardingSurveyTiming', () => {
  it('marks an account with a deployed service as predating the feature', async () => {
    setup(makePearlStore({}), { services: [makeDeployedService()] });

    await waitFor(() => expect(classification()?.[1]).toBe(true));
  });

  it('marks a fresh install as a new account', async () => {
    setup(makePearlStore({}), { services: [] });

    await waitFor(() => expect(classification()?.[1]).toBe(false));
  });

  it('marks an account whose service is created but not deployed as new', async () => {
    setup(makePearlStore({}), { services: [makeUndeployedService()] });

    await waitFor(() => expect(classification()?.[1]).toBe(false));
  });

  it('does nothing before the store has hydrated', () => {
    setup(undefined, { services: [] });

    expect(classification()).toBeUndefined();
  });

  it('does not classify before the service list has been fetched', () => {
    setup(makePearlStore({}), { services: undefined, isFetched: false });

    expect(classification()).toBeUndefined();
  });

  it('does not classify when the list is undefined even though isFetched reads true', () => {
    // `isFetched` is `!isLoading`, which a disabled query (offline at launch) also reports.
    setup(makePearlStore({}), { services: undefined, isFetched: true });

    expect(classification()).toBeUndefined();
  });

  it('does not reclassify once already recorded', () => {
    setup(
      makePearlStore({
        onboardingSurvey: makeOnboardingSurveyState({
          timingUnavailable: true,
        }),
      }),
      { services: [makeUndeployedService()] },
    );

    expect(classification()).toBeUndefined();
  });
});
