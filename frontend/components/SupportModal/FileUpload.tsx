import { Typography, Upload, UploadFile } from 'antd';
import { UploadChangeParam } from 'antd/es/upload';

const { Text, Paragraph } = Typography;

interface FileUploadProps {
  onChange?: (info: UploadChangeParam<UploadFile>) => void;
  multiple?: boolean;
  accept?: string;
}

export const FileUpload = ({
  onChange,
  multiple = true,
  accept,
}: FileUploadProps) => {
  return (
    <Upload.Dragger
      name="files"
      multiple={multiple}
      accept={accept}
      beforeUpload={() => false}
      onChange={onChange}
    >
      <Paragraph className="ant-upload-drag-icon">📎</Paragraph>
      <Paragraph className="ant-upload-text">
        Click or drag files to this area to upload
      </Paragraph>
      <Text className="ant-upload-hint">
        Support for single or bulk upload. Screenshots, logs, or other relevant
        files.
      </Text>
    </Upload.Dragger>
  );
};
