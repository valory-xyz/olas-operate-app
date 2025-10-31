import { Button, Flex, Typography, Upload, UploadFile } from 'antd';
import { UploadChangeParam } from 'antd/es/upload';
import { TbCloudUpload, TbPaperclip, TbTrash } from 'react-icons/tb';

import { COLOR } from '@/constants/colors';

import { formatFileSize } from './utils';

const { Text } = Typography;

const DRAGGER_STYLES: React.CSSProperties = {
  backgroundColor: COLOR.BACKGROUND,
  padding: 8,
  border: `1px dashed ${COLOR.GRAY_3}`,
};

const ACCEPTED_UPLOAD_ACCEPT = [
  'image/*',
  'video/*',
  '.zip',
  'application/zip',
  'application/x-zip-compressed',
].join(',');

type FileUploadProps = {
  onChange?: (info: UploadChangeParam<UploadFile>) => void;
  fileList?: UploadFile[];
};

const FileUpload = ({ onChange, fileList }: FileUploadProps) => {
  return (
    <Upload.Dragger
      name="files"
      multiple
      accept={ACCEPTED_UPLOAD_ACCEPT}
      beforeUpload={() => false}
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
          Max 5 files, 50MB each.
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
