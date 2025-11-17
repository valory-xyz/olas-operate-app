import type { UploadFile } from 'antd';
import { compact } from 'lodash';

export type FileDetails = {
  fileName: string;
  fileContent: string;
  mimeType: string;
};

export const formatAttachments = async (
  files: UploadFile[],
): Promise<FileDetails[]> => {
  if (files.length === 0) return [];

  const filePromises = files.map((file): Promise<FileDetails | null> => {
    const fileObject = file.originFileObj;
    if (!fileObject) return Promise.resolve(null);

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const fileContent = reader.result as string;
          const {
            name: fileName,
            type: mimeType = 'application/octet-stream',
          } = file;
          resolve({
            fileName,
            fileContent,
            mimeType,
          });
        } catch (error) {
          reject(new Error(`Failed to process file ${file.name}`));
        }
      };
      reader.onerror = () => {
        reject(new Error(`Failed to read file ${file.name}`));
      };
      reader.readAsDataURL(fileObject);
    });
  });

  return compact(await Promise.all(filePromises));
};

export const formatFileSize = (bytes?: number): string => {
  if (!bytes) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};
