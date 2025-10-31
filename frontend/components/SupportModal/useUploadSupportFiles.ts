import { message, UploadFile } from 'antd';
import { isNil } from 'lodash';
import { useCallback } from 'react';

import { useElectronApi, useLogs } from '@/hooks';
import { SupportService } from '@/service/Support';
import { Nullable } from '@/types';

import { FileDetails, formatAttachments } from './utils';

export const useUploadSupportFiles = () => {
  const logs = useLogs();
  const { saveLogsForSupport, readFile } = useElectronApi();

  const loadLogsFile = useCallback(async (): Promise<Nullable<FileDetails>> => {
    if (!logs || !saveLogsForSupport || !readFile) return null;

    const result = await saveLogsForSupport(logs);
    if (!result.success) {
      message.error('Failed to save logs');
      return null;
    }

    const fileResult = await readFile(result.filePath);
    if (!fileResult.success) {
      message.error(fileResult.error || 'Failed to save logs');
      return null;
    }

    return fileResult;
  }, [logs, saveLogsForSupport, readFile]);

  const uploadFile = useCallback(
    async (file: FileDetails): Promise<string | null> => {
      try {
        const result = await SupportService.uploadFile(file);
        if (!result.success) {
          throw new Error(result.error);
        }
        return result.token;
      } catch (error) {
        message.error(
          error instanceof Error
            ? error.message
            : `Failed to upload file ${file.fileName}. Please try again.`,
        );
        return null;
      }
    },
    [],
  );

  const uploadFiles = useCallback(
    async (
      files: UploadFile[],
      shouldIncludeLogs: boolean,
    ): Promise<string[]> => {
      const [attachments, logsFile] = await Promise.all([
        formatAttachments(files),
        shouldIncludeLogs ? loadLogsFile() : Promise.resolve(null),
      ]);
      const filesToUpload = [...attachments, ...(logsFile ? [logsFile] : [])];

      const uploadTokens = await Promise.all(
        filesToUpload.map(async (file) => {
          return await uploadFile(file);
        }),
      );

      return uploadTokens.filter((token): token is string => !isNil(token));
    },
    [loadLogsFile, uploadFile],
  );

  return { uploadFiles };
};
