import { Flex, Typography, Upload, UploadFile } from 'antd';
import { UploadChangeParam } from 'antd/es/upload';
import { TbCloudUpload, TbPaperclip } from 'react-icons/tb';

import { COLOR } from '@/constants/colors';

const { Text } = Typography;

const DRAGGAR_STYLES: React.CSSProperties = {
  backgroundColor: COLOR.BACKGROUND,
  padding: 8,
  border: `1px dashed ${COLOR.GRAY_3}`,
};

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const FileUpload = ({
  onChange,
  multiple = true,
  accept,
}: Omit<FileUploadWithListProps, 'uploadedFiles'>) => {
  return (
    <Upload.Dragger
      name="files"
      multiple={multiple}
      accept={accept}
      beforeUpload={() => false}
      showUploadList={false}
      onChange={onChange}
      style={DRAGGAR_STYLES}
    >
      <Flex vertical gap={8} align="center" justify="center">
        <TbCloudUpload size={32} color={COLOR.PRIMARY} />
        <Text type="secondary" className="text-sm mt-8">
          Upload screenshots of the issue
        </Text>
        <Text className="text-neutral-tertiary text-xs">
          Max 5 files, 10MB each.
        </Text>
      </Flex>
    </Upload.Dragger>
  );
};

const UploadedFilesList = ({
  uploadedFiles,
}: {
  uploadedFiles: UploadFile[];
}) => (
  <>
    {uploadedFiles.length > 0 && (
      <Flex vertical gap={8}>
        {uploadedFiles.map((file) => (
          <Flex key={file.uid} align="center" gap={8}>
            <TbPaperclip size={16} />
            <Text className="text-sm text-primary">{file.name}</Text>
            <Text className="text-sm text-neutral-tertiary">
              ({formatFileSize(file.size)})
            </Text>
          </Flex>
        ))}
      </Flex>
    )}
  </>
);

type FileUploadWithListProps = {
  onChange?: (info: UploadChangeParam<UploadFile>) => void;
  multiple?: boolean;
  accept?: string;
  uploadedFiles?: UploadFile[];
};

export const FileUploadWithList = ({
  onChange,
  multiple = true,
  accept,
  uploadedFiles = [],
}: FileUploadWithListProps) => {
  return (
    <Flex vertical gap={12}>
      <FileUpload onChange={onChange} multiple={multiple} accept={accept} />
      <UploadedFilesList uploadedFiles={uploadedFiles} />
    </Flex>
  );
};
