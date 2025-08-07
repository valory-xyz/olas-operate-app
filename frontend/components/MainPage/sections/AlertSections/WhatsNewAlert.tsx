import useToken from 'antd/es/theme/useToken';
import { useEffect, useState } from 'react';
import semver from 'semver';

import { CustomAlert } from '@/components/Alert';
import { ArrowUpRightSvg } from '@/components/custom-icons/ArrowUpRight';
import { useElectronApi } from '@/hooks/useElectronApi';

const ALERT_STORAGE_KEY = 'lastSeenAppVersion';

export const WhatsNewAlert = () => {
  const { getAppVersion } = useElectronApi();
  const [, token] = useToken();
  const [shouldShowAlert, setShouldShowAlert] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);

  useEffect(() => {
    const checkIfJustUpdated = async () => {
      if (!getAppVersion) return;

      const version = await getAppVersion();
      if (!version || !semver.valid(version)) return;

      setCurrentVersion(version);

      const lastSeenVersion = localStorage.getItem(ALERT_STORAGE_KEY);

      if (!lastSeenVersion || semver.gt(version, lastSeenVersion)) {
        setShouldShowAlert(true);
      }
    };

    checkIfJustUpdated();
  }, [getAppVersion]);

  const handleClose = () => {
    if (currentVersion) {
      localStorage.setItem(ALERT_STORAGE_KEY, currentVersion);
    }
    setShouldShowAlert(false);
  };

  if (!shouldShowAlert || !currentVersion) return null;

  return (
    <CustomAlert
      type="info"
      fullWidth
      showIcon
      closable
      onClose={handleClose}
      message={
        <>
          <span>Read </span>
          <a
            href={`https://github.com/valory-xyz/olas-operate-app/releases/tag/v${currentVersion}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            what&apos;s new in Pearl{' '}
            <ArrowUpRightSvg
              fill={token.colorPrimary}
              style={{ marginBottom: -2 }}
            />
          </a>{' '}
          <span>and discover specific agent updates in the Agent Profile.</span>
        </>
      }
    />
  );
};
