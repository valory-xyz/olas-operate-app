import { useQuery } from '@tanstack/react-query';
import { Flex } from 'antd';
import useToken from 'antd/es/theme/useToken';
import { useEffect, useState } from 'react';
import semver from 'semver';

import { CustomAlert } from '@/components/Alert';
import { ArrowUpRightSvg } from '@/components/custom-icons/ArrowUpRight';
import { FIVE_MINUTE_INTERVAL } from '@/constants/intervals';
import { GITHUB_API_LATEST_RELEASE } from '@/constants/urls';
import { useElectronApi } from '@/hooks/useElectronApi';

enum SemverComparisonResult {
  OUTDATED = -1,
  EQUAL = 0,
  UPDATED = 1,
}

type Result = {
  isPearlNewlyUpdated: boolean;
  latestTag: string | null;
};

const ALERT_STORAGE_KEY = 'pearlUpdateAlertSeen';

export const WhatsNewAlert = () => {
  const { getAppVersion } = useElectronApi();
  const [, token] = useToken();
  const [shouldShowAlert, setShouldShowAlert] = useState(false);

  const { data, isFetched } = useQuery<Result>({
    queryKey: ['isPearlNewlyUpdated'],
    queryFn: async (): Promise<Result> => {
      if (!getAppVersion) {
        console.error('electronAPI.getAppVersion is not available in Window');
        return { isPearlNewlyUpdated: false, latestTag: null };
      }

      const appVersion = await getAppVersion();
      if (!appVersion) return { isPearlNewlyUpdated: false, latestTag: null };

      const response = await fetch(GITHUB_API_LATEST_RELEASE);
      if (!response.ok) return { isPearlNewlyUpdated: false, latestTag: null };

      const data = await response.json();
      const latestTag = data.tag_name;
      const latestVersion = semver.parse(latestTag);
      const currentVersion = semver.parse(appVersion ?? '0.0.0');

      if (!latestVersion || !currentVersion) {
        return { isPearlNewlyUpdated: false, latestTag: null };
      }

      const comparison: SemverComparisonResult = semver.compare(
        appVersion,
        latestVersion,
      );

      const isUpdated = comparison === SemverComparisonResult.EQUAL;

      return { isPearlNewlyUpdated: isUpdated, latestTag };
    },
    refetchInterval: FIVE_MINUTE_INTERVAL,
  });

  useEffect(() => {
    const alreadySeen = localStorage.getItem(ALERT_STORAGE_KEY) === 'true';

    if (isFetched && data?.isPearlNewlyUpdated && !alreadySeen) {
      setShouldShowAlert(true);
    }
  }, [data, isFetched]);

  const handleClose = () => {
    localStorage.setItem(ALERT_STORAGE_KEY, 'true');
    setShouldShowAlert(false);
  };

  if (!shouldShowAlert || !data?.latestTag) {
    return null;
  }

  return (
    <CustomAlert
      type="info"
      fullWidth
      showIcon
      closable
      onClose={handleClose}
      message={
        <Flex align="center" justify="space-between" gap={2}>
          <span>Read </span>
          <a
            href={`https://github.com/valory-xyz/olas-operate-app/releases/tag/${data.latestTag}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            what&apos;s new in Pearl{' '}
            <ArrowUpRightSvg
              fill={token.colorPrimary}
              style={{ marginBottom: -2 }}
            />
          </a>
          <span>and discover specific agent updates in the Agent Profile.</span>
        </Flex>
      }
    />
  );
};
