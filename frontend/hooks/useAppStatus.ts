import { useQuery } from '@tanstack/react-query';
import semver from 'semver';

import {
  FIVE_MINUTE_INTERVAL,
  GITHUB_API_LATEST_RELEASE,
  REACT_QUERY_KEYS,
} from '@/constants';

import { useElectronApi } from './useElectronApi';

export enum SemverComparisonResult {
  OUTDATED = -1,
  EQUAL = 0,
  UPDATED = 1,
}

type useAppStatusResult = {
  isOutdated: boolean;
  latestTag: string | null;
};

export const useAppStatus = () => {
  const { getAppVersion } = useElectronApi();

  return useQuery<useAppStatusResult, Error>({
    queryKey: REACT_QUERY_KEYS.IS_PEARL_OUTDATED_KEY,
    queryFn: async (): Promise<useAppStatusResult> => {
      if (!getAppVersion) {
        throw new Error('getAppVersion is not available');
      }

      const appVersion = await getAppVersion();
      if (!appVersion) throw new Error('App version is undefined');

      const response = await fetch(GITHUB_API_LATEST_RELEASE);
      if (!response.ok) {
        throw new Error('Failed to fetch latest release');
      }

      const data = await response.json();
      const latestTag: string = data.tag_name;
      const latestVersion = semver.parse(latestTag);
      const currentVersion = semver.parse(appVersion);

      if (!latestVersion || !currentVersion) {
        throw new Error('Failed to parse semver');
      }

      const isOutdated =
        semver.compare(appVersion, latestVersion) ===
        SemverComparisonResult.OUTDATED;

      return {
        isOutdated,
        latestTag,
      };
    },
    refetchInterval: FIVE_MINUTE_INTERVAL,
    refetchOnWindowFocus: false,
  });
};
