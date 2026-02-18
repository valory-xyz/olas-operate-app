import { Button, Flex, message, Typography, Upload, UploadFile } from 'antd';
import { RcFile, UploadChangeParam } from 'antd/es/upload';
import { TbCloudUpload, TbPaperclip, TbTrash } from 'react-icons/tb';

import { COLOR } from '@/constants/colors';

import { formatFileSize } from './utils';

const { Text } = Typography;

const MAX_FILES = 5;
const MAX_FILE_SIZE_MB = 4.5;
const ACCEPTED_FILE_TYPES = [
  'image/*',
  'video/*',
  '.zip',
  'application/zip',
  'application/x-zip-compressed',
].join(',');

/**
 * Validate files before adding to the upload list.
 * - Returning Upload.LIST_IGNORE prevents the file from being added.
 * - Returning false allows adding.
 */
const beforeUpload = (
  file: RcFile,
  addedFileList: RcFile[],
  currentFileList: UploadFile[],
) => {
  const totalFiles = addedFileList.length + currentFileList.length;
  const fileSizeMB = file.size / 1024 / 1024;

  if (totalFiles > MAX_FILES) {
    message.error({ content: 'Too Many Files', key: 'max-files-error' });
    return Upload.LIST_IGNORE;
  }

  if (fileSizeMB > MAX_FILE_SIZE_MB) {
    message.error({ content: 'File Too Large', key: 'file-size-error' });
    return Upload.LIST_IGNORE;
  }

  return false;
};

const DRAGGER_STYLES: React.CSSProperties = {
  backgroundColor: COLOR.BACKGROUND,
  padding: 8,
  border: `1px dashed ${COLOR.GRAY_3}`,
};

type FileUploadProps = {
  onChange?: (info: UploadChangeParam<UploadFile>) => void;
  fileList?: UploadFile[];
};
const FileUpload = ({ onChange, fileList }: FileUploadProps) => {
  return (
    <Upload.Dragger
      name="files"
      multiple
      accept={ACCEPTED_FILE_TYPES}
      beforeUpload={(file, addedFileList) =>
        beforeUpload(file, addedFileList, fileList || [])
      }
      showUploadList={false}
      onChange={onChange}
      fileList={fileList}
      style={DRAGGER_STYLES}
    >
      <Flex vertical gap={8} align="center" justify="center">
        <TbCloudUpload size={32} color={COLOR.PRIMARY} />
        <Text type="secondary" className="text-sm mt-8">
          Upload screenshots of the issue
        </Text>
        <Text className="text-neutral-tertiary text-xs">
          Max {MAX_FILES} files, {MAX_FILE_SIZE_MB}MB each.
        </Text>
      </Flex>
    </Upload.Dragger>
  );
};

const UploadedFilesList = ({
  uploadedFiles,
  onRemove,
}: {
  uploadedFiles: UploadFile[];
  onRemove?: (uid: string) => void;
}) => (
  <>
    {uploadedFiles.length > 0 && (
      <Flex vertical gap={8}>
        {uploadedFiles.map((file) => (
          <Flex key={file.uid} align="center" justify="space-between">
            <Flex align="center" gap={8}>
              <TbPaperclip size={16} />
              <Text className="text-sm text-primary">{file.name}</Text>
              <Text className="text-sm text-neutral-tertiary">
                ({formatFileSize(file.size)})
              </Text>
            </Flex>

            <Button
              type="text"
              size="small"
              aria-label={`Remove ${file.name}`}
              onClick={() => onRemove?.(file.uid)}
              icon={<TbTrash size={16} />}
            />
          </Flex>
        ))}
      </Flex>
    )}
  </>
);

type FileUploadWithListProps = {
  onChange?: (info: UploadChangeParam<UploadFile>) => void;
  multiple?: boolean;
  uploadedFiles?: UploadFile[];
  onRemoveFile?: (uid: string) => void;
};

export const FileUploadWithList = ({
  onChange,
  uploadedFiles = [],
  onRemoveFile,
}: FileUploadWithListProps) => {
  return (
    <Flex vertical gap={12}>
      <FileUpload onChange={onChange} fileList={uploadedFiles} />
      <UploadedFilesList
        uploadedFiles={uploadedFiles}
        onRemove={onRemoveFile}
      />
    </Flex>
  );
};
