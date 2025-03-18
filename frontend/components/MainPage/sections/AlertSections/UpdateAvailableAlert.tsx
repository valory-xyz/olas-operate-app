import { useQuery } from '@tanstack/react-query';
import { Flex } from 'antd';
import useToken from 'antd/es/theme/useToken';
import semver from 'semver';

import { CustomAlert } from '@/components/Alert';
import { ArrowUpRightSvg } from '@/components/custom-icons/ArrowUpRight';
import { FIVE_MINUTES_INTERVAL } from '@/constants/intervals';
import {
  DOWNLOAD_URL_EA,
  DOWNLOAD_URL_PUBLIC,
  GITHUB_API_LATEST_RELEASE,
} from '@/constants/urls';
import { useElectronApi } from '@/hooks/useElectronApi';

enum SemverComparisonResult {
  OUTDATED = -1,
  EQUAL = 0,
  UPDATED = 1,
}

type GithubRelease = { tag_name: string };

const isEaRelease = false; // TODO

const isNewEaReleaseAvailable = (oldVersion: string, newVersion: string) => {
  const oldClean = oldVersion.replace(/-all$/, '');
  const newClean = newVersion.replace(/-all$/, '');

  if (!oldClean || !newClean) return false;
  return semver.gt(newClean, oldClean);
};

const isNewPublicReleaseAvailable = (
  oldVersion: string,
  newVersion: string,
) => {
  const latestVersion = semver.parse(newVersion);
  const currentVersion = semver.parse(oldVersion);

  if (!latestVersion || !currentVersion) return false;

  // console.log('latestVersion', {
  //   newVersion,
  //   oldVersion,
  //   latestVersion,
  //   currentVersion,
  // });

  const comparison: SemverComparisonResult = semver.compare(
    currentVersion,
    latestVersion,
  );

  return comparison === SemverComparisonResult.OUTDATED;
};

const getLatestPublicRelease = async (): Promise<string | null> => {
  return '0.2.0-rc245-all';

  const response = await fetch(GITHUB_API_LATEST_RELEASE);
  if (!response.ok) return null;

  const data: GithubRelease = await response.json();
  console.log('data', data);
  return data.tag_name;
};

const getLatestEaRelease = async (): Promise<string | null> => {
  return '0.2.0-rc245-all';

  const response = await fetch(GITHUB_API_LATEST_RELEASE);
  if (!response.ok) return null;

  const data: GithubRelease = await response.json();
  console.log('data', data);
  return data.tag_name;
};

export const UpdateAvailableAlert = () => {
  const { getAppVersion } = useElectronApi();
  const [, token] = useToken();

  const { data: isPearlOutdated, isFetched } = useQuery({
    queryKey: ['isPearlOutdated'],
    queryFn: async (): Promise<boolean> => {
      if (!getAppVersion) {
        console.error('electronAPI.getAppVersion is not available in Window');
        return false;
      }

      const appVersion = await getAppVersion();
      if (!appVersion) return false;

      if (isEaRelease) {
        const latestVersionString = await getLatestEaRelease();
        if (!latestVersionString) return false;

        return isNewEaReleaseAvailable(appVersion, latestVersionString);
      }

      const latestVersionString = await getLatestPublicRelease();
      if (!latestVersionString) return false;

      return isEaRelease
        ? isNewEaReleaseAvailable(appVersion, latestVersionString)
        : isNewPublicReleaseAvailable(appVersion, latestVersionString);
    },
    refetchInterval: FIVE_MINUTES_INTERVAL,
  });

  if (!isFetched || !isPearlOutdated) {
    return null;
  }

  return (
    <CustomAlert
      type="info"
      fullWidth
      showIcon
      message={
        <Flex align="center" justify="space-between" gap={2}>
          <span>A new version of Pearl is available</span>
          <a
            href={isEaRelease ? DOWNLOAD_URL_EA : DOWNLOAD_URL_PUBLIC}
            target="_blank"
          >
            Download{' '}
            <ArrowUpRightSvg
              fill={token.colorPrimary}
              style={{ marginBottom: -2 }}
            />
          </a>
        </Flex>
      }
    />
  );
};

/**
 * - How to add IS_EA_RELEASE in the build so it is available in the process.env
 * - Ask Admin to add Github token to actually get the draft releases version (ea is a draft release)
 * - Test: Once really released, test if the alert is shown and navigate to the "EA" download link
 */
