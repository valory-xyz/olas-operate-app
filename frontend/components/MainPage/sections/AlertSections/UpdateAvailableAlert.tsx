import { useQuery } from '@tanstack/react-query';
import { Flex, Typography } from 'antd';
import useToken from 'antd/es/theme/useToken';
import semver from 'semver';

import { CustomAlert } from '@/components/Alert';
import { ArrowUpRightSvg } from '@/components/custom-icons/ArrowUpRight';
import { FIVE_MINUTE_INTERVAL } from '@/constants/intervals';
import {
  DOWNLOAD_URL_EA,
  DOWNLOAD_URL_PUBLIC,
  GITHUB_API_LATEST_RELEASE,
} from '@/constants/urls';
import { useElectronApi } from '@/hooks/useElectronApi';

const { Text } = Typography;

const IS_EA_RELEASE = process.env.NEXT_PUBLIC_IS_EA === 'true';

enum SemverComparisonResult {
  OUTDATED = -1,
  EQUAL = 0,
  UPDATED = 1,
}

/** Compare two versions of a release and return if the new version is available */
const isNewReleaseAvailable = (oldVersion: string, newVersion: string) => {
  const latestVersion = semver.parse(newVersion);
  const currentVersion = semver.parse(oldVersion);

  if (!latestVersion || !currentVersion) return false;

  const comparison: SemverComparisonResult = semver.compare(
    currentVersion,
    latestVersion,
  );

  return comparison === SemverComparisonResult.OUTDATED;
};

/** Compare two versions of EA release and return if the new version is available */
const isNewEaReleaseAvailable = (oldVersion: string, newVersion: string) => {
  const oldClean = oldVersion.replace(/-all$/, '');
  const newClean = newVersion.replace(/-all$/, '');

  if (!oldClean || !newClean) return false;
  return isNewReleaseAvailable(oldClean, newClean);
};

type GithubRelease = { tag_name: string };

/** Get the latest public release from the Github API */
const getLatestPublicRelease = async (): Promise<string | null> => {
  const response = await fetch(GITHUB_API_LATEST_RELEASE);
  if (!response.ok) return null;

  const data: GithubRelease = await response.json();
  return data.tag_name;
};

const useGetPearlOutdated = () => {
  const { getAppVersion, getLatestEaRelease } = useElectronApi();

  return useQuery({
    queryKey: ['isPearlOutdated'],
    queryFn: async (): Promise<boolean> => {
      const appVersion = await getAppVersion!();
      if (!appVersion) return false;

      const latestVersion = IS_EA_RELEASE
        ? await getLatestEaRelease!()
        : await getLatestPublicRelease();

      // TODO: Remove this console.log
      window.console.log({
        appVersion,
        latestVersion,
        IS_EA_RELEASE,
        IS_EA: process.env.IS_EA,
        NEXT_PUBLIC_IS_EA: process.env.NEXT_PUBLIC_IS_EA,
        NODE_ENV: process.env.NODE_ENV,
      });

      // TODO: Remove this IF
      if (getLatestEaRelease) {
        try {
          const response = await getLatestEaRelease();
          window.console.log(
            'All tags (including all draft releases):',
            response,
          );
        } catch (error) {
          console.error(error);
        }
      }

      if (!latestVersion) return false;

      window.console.log('>>>>> Is Pearl outdated? >>>>>', {
        appVersion,
        latestVersion,
      });

      return IS_EA_RELEASE
        ? isNewEaReleaseAvailable(appVersion, latestVersion)
        : isNewReleaseAvailable(appVersion, latestVersion);
    },
    refetchInterval: FIVE_MINUTE_INTERVAL,
    enabled: !!getAppVersion && !!getLatestEaRelease,
  });
};

/**
 * Display an alert if a new version of Pearl is available.
 */
export const UpdateAvailableAlert = () => {
  const [, token] = useToken();
  const { data: isPearlOutdated, isFetched, isError } = useGetPearlOutdated();

  if (!isFetched || !isPearlOutdated) return null;

  // TODO: remove it after testing
  if (isError) {
    return (
      <CustomAlert
        type="error"
        fullWidth
        showIcon
        message="Something went wrong while checking for updates"
      />
    );
  }

  return (
    <CustomAlert
      type="info"
      fullWidth
      showIcon
      message={
        <Flex align="center" justify="space-between" gap={2}>
          <Text>A new version of Pearl is available</Text>
          <a
            href={IS_EA_RELEASE ? DOWNLOAD_URL_EA : DOWNLOAD_URL_PUBLIC}
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
