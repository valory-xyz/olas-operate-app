import { Button, message } from 'antd';
import { useCallback, useEffect, useState } from 'react';

import { useElectronApi } from '@/hooks/useElectronApi';
import { useLogs } from '@/hooks/useLogs';

const LogsSavedMessage = ({ onClick }: { onClick: () => void }) => {
  return (
    <span>
      Logs saved
      <Button type="link" size="small" onClick={onClick}>
        Open folder
      </Button>
    </span>
  );
};

export const ExportLogsButton = () => {
  const { openPath, saveLogs } = useElectronApi();
  const logs = useLogs();

  const [isLoading, setIsLoading] = useState(false);
  const [canSaveLogs, setCanSaveLogs] = useState(false);

  const onSaveLogs = useCallback(() => setCanSaveLogs(true), []);

  useEffect(() => {
    if (isLoading) return;
    if (!logs) return;
    if (!canSaveLogs) return;

    setIsLoading(true);
    saveLogs?.(logs)
      .then((result) => {
        if (result.success) {
          message.success({
            content: (
              <LogsSavedMessage onClick={() => openPath?.(result.dirPath)} />
            ),
            duration: 10,
          });
        } else {
          message.error('Save logs failed or cancelled');
        }
      })
      .finally(() => {
        setIsLoading(false);
        setCanSaveLogs(false);
      });
  }, [canSaveLogs, isLoading, logs, openPath, saveLogs]);

  return (
    <Button
      type="primary"
      ghost
      size="large"
      loading={isLoading || canSaveLogs}
      onClick={onSaveLogs}
    >
      Export logs
    </Button>
  );
};
