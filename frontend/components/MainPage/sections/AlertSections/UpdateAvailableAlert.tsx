import { useQuery } from '@tanstack/react-query';
import { Flex } from 'antd';
import useToken from 'antd/es/theme/useToken';
import semver from 'semver';

import { CustomAlert } from '@/components/Alert';
import { ArrowUpRightSvg } from '@/components/custom-icons/ArrowUpRight';
import { FIVE_MINUTE_INTERVAL } from '@/constants/intervals';
import { DOWNLOAD_URL, GITHUB_API_LATEST_RELEASE } from '@/constants/urls';
import { useElectronApi } from '@/hooks/useElectronApi';

enum SemverComparisonResult {
  OUTDATED = -1,
  EQUAL = 0,
  UPDATED = 1,
}

export const UpdateAvailableAlert = () => {
  const { getAppVersion } = useElectronApi();
  const [, token] = useToken();

  const { data: isPearlOutdated, isFetched } = useQuery<boolean>({
    queryKey: ['isPearlOutdated'],
    queryFn: async (): Promise<boolean> => {
      if (!getAppVersion) {
        console.error('electronAPI.getAppVersion is not available in Window');
        return false;
      }

      const appVersion = await getAppVersion();
      if (!appVersion) return false;

      const response = await fetch(GITHUB_API_LATEST_RELEASE);
      if (!response.ok) return false;

      const data = await response.json();
      const latestTag = data.tag_name;
      const latestVersion = semver.parse(latestTag);
      const currentVersion = semver.parse(appVersion ?? '0.0.0');

      if (!latestVersion || !currentVersion) {
        return false;
      }

      const comparison: SemverComparisonResult = semver.compare(
        appVersion,
        latestVersion,
      );

      return comparison === SemverComparisonResult.OUTDATED;
    },
    refetchInterval: FIVE_MINUTE_INTERVAL,
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
          <a href={DOWNLOAD_URL} target="_blank">
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
