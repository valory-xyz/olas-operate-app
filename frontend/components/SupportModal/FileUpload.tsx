import { Flex, Typography, Upload, UploadFile } from 'antd';
import { UploadChangeParam } from 'antd/es/upload';
import { TbCloudUpload } from 'react-icons/tb';

import { COLOR } from '@/constants/colors';

const { Text } = Typography;

const DRAGGAR_STYLES: React.CSSProperties = {
  backgroundColor: COLOR.BACKGROUND,
  padding: 8,
  border: `1px dashed ${COLOR.GRAY_3}`,
};

type FileUploadProps = {
  onChange?: (info: UploadChangeParam<UploadFile>) => void;
  multiple?: boolean;
  accept?: string;
};

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
