import { theme, Typography } from 'antd';
import { useEffect, useState } from 'react';
import semver from 'semver';

import { CustomAlert } from '@/components/Alert';
import { ArrowUpRightSvg } from '@/components/custom-icons/ArrowUpRight';
import { useElectronApi } from '@/hooks/useElectronApi';

const { Text } = Typography;
const { useToken } = theme;

export const WhatsNewAlert = () => {
  const { getAppVersion, store } = useElectronApi();
  const { token } = useToken();
  const [shouldShowAlert, setShouldShowAlert] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);

  useEffect(() => {
    const checkIfJustUpdated = async () => {
      if (!getAppVersion) return;

      const version = await getAppVersion();
      if (!version || !semver.valid(version)) return;

      setCurrentVersion(version);

      if (store?.get) {
        const lastSeenVersion = await store?.get('knownVersion');

        if (!lastSeenVersion || semver.gt(version, lastSeenVersion as string)) {
          setShouldShowAlert(true);
        }
      }
    };

    checkIfJustUpdated();
  }, [getAppVersion, store]);

  const handleClose = () => {
    if (currentVersion && store?.set) {
      store.set('knownVersion', currentVersion);
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
          <Text>Read </Text>
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
          <Text>and discover specific agent updates.</Text>
        </>
      }
    />
  );
};
