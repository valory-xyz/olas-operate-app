import { Button, ButtonProps, message } from 'antd';
import { useCallback, useEffect, useState } from 'react';

import { useElectronApi } from '@/hooks/useElectronApi';
import { useLogs } from '@/hooks/useLogs';

const LogsSavedMessage = ({ onClick }: { onClick: () => void }) => (
  <span>
    Logs saved
    <Button type="link" size="small" onClick={onClick}>
      Open folder
    </Button>
  </span>
);

type ExportLogsButtonProps = { size?: ButtonProps['size'] };

export const ExportLogsButton = ({ size }: ExportLogsButtonProps) => {
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
      loading={isLoading || canSaveLogs}
      onClick={onSaveLogs}
      size={size || 'middle'}
      type="default"
    >
      Export logs
    </Button>
  );
};
