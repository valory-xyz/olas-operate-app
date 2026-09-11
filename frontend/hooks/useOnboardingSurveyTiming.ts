import { useEffect } from 'react';

import { isValidServiceId } from '@/utils/service';

import { useElectronApi } from './useElectronApi';
import { useServices } from './useServices';
import { useStore } from './useStore';

const STORE_KEY = 'onboardingSurvey';

/**
 * One-time classification of the account for the post-setup questionnaire, persisted as
 * `onboardingSurvey.timingUnavailable`.
 *
 * `true` means the account already had a deployed service the first time this ran, i.e. it
 * predates the feature: its `firstAppOpenedAt` stamp is meaningless and it never gets the
 * questionnaire (the functional scope excludes a retroactive trigger). `false` means a new
 * account, eligible once its first success happens.
 *
 * Mounted once at the app root rather than in `Main`, so a new account is classified right after
 * login, before onboarding creates and deploys anything. "Deployed" is `isValidServiceId`: the
 * middleware writes `token: -1` for a created-but-undeployed service.
 */
export const useOnboardingSurveyTiming = () => {
  const { store } = useElectronApi();
  const { storeState } = useStore();
  const { services, isFetched: isServicesFetched } = useServices();

  const isStoreHydrated = storeState !== undefined;
  const timingUnavailable = storeState?.[STORE_KEY]?.timingUnavailable;
  // `isFetched` is `!isLoading`, which a query that never ran (offline at launch) also reports;
  // an undefined list is the tell that nothing was actually fetched.
  const hasServiceList = isServicesFetched && services !== undefined;

  useEffect(() => {
    if (!isStoreHydrated) return;
    if (timingUnavailable !== undefined) return;
    if (!hasServiceList) return;

    const hasPreExistingService = services.some((service) =>
      isValidServiceId(
        service.chain_configs?.[service.home_chain]?.chain_data?.token,
      ),
    );

    store?.set?.(`${STORE_KEY}.timingUnavailable`, hasPreExistingService);
  }, [hasServiceList, isStoreHydrated, services, store, timingUnavailable]);
};
