import type { UploadFile } from 'antd';

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

  return Promise.all(filePromises).then(
    (results) => results.filter(Boolean) as FileDetails[],
  );
};
