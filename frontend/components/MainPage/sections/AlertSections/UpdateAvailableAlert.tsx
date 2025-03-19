import { Octokit } from '@octokit/core';
import { useQuery } from '@tanstack/react-query';
import { Flex, Typography } from 'antd';
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

const { Text } = Typography;

const OCTOKIT = new Octokit({
  auth: process.env.NEXT_PUBLIC_GITHUB_AUTH_TOKEN,
});

enum SemverComparisonResult {
  OUTDATED = -1,
  EQUAL = 0,
  UPDATED = 1,
}

type GithubRelease = { tag_name: string };

const isEaRelease = true; // TODO

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

/** Get the latest public release from the Github API */
const getLatestPublicRelease = async (): Promise<string | null> => {
  const response = await fetch(GITHUB_API_LATEST_RELEASE);
  if (!response.ok) return null;

  const data: GithubRelease = await response.json();
  return data.tag_name;
};

type Tag = { name: string };

/** Get the latest EA release from the Github API */
const getLatestEaRelease = async () => {
  try {
    const tags = await OCTOKIT.request(
      'GET /repos/valory-xyz/olas-operate-app/tags',
      {
        headers: { 'X-GitHub-Api-Version': '2022-11-28' },
      },
    );

    const allTags: Tag[] = tags.data;

    // Find the latest tag that ends with `-all`
    const latestTag = allTags.find((item: Tag) => item.name.endsWith(`-all`));
    if (!latestTag) return null;

    return latestTag.name;
  } catch (error) {
    console.error(error);
  }

  return null;
};

const useGetPearlOutdated = () => {
  const { getAppVersion } = useElectronApi();

  return useQuery({
    queryKey: ['isPearlOutdated'],
    queryFn: async (): Promise<boolean> => {
      if (!getAppVersion) {
        console.error('electronAPI.getAppVersion is not available in Window');
        return false;
      }

      const appVersion = await getAppVersion();
      if (!appVersion) return false;

      const latestVersion = isEaRelease
        ? await getLatestEaRelease()
        : await getLatestPublicRelease();
      if (!latestVersion) return false;

      return isEaRelease
        ? isNewEaReleaseAvailable(appVersion, latestVersion)
        : isNewReleaseAvailable(appVersion, latestVersion);
    },
    refetchInterval: FIVE_MINUTES_INTERVAL,
  });
};

/**
 * Display an alert if a new version of Pearl is available
 */
export const UpdateAvailableAlert = () => {
  const [, token] = useToken();
  const { data: isPearlOutdated, isFetched } = useGetPearlOutdated();

  if (!isFetched || !isPearlOutdated) return null;

  return (
    <CustomAlert
      type="info"
      fullWidth
      showIcon
      message={
        <Flex align="center" justify="space-between" gap={2}>
          <Text>A new version of Pearl is available</Text>
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
