import { Typography } from 'antd';
import { CSSProperties } from 'react';

import { CustomAlert } from '@/components/Alert';

const { Text } = Typography;

type InvalidGeminiApiCredentialsProps = {
  style?: CSSProperties;
};

export const InvalidGeminiApiCredentials = ({
  style,
}: InvalidGeminiApiCredentialsProps) => (
  <CustomAlert
    type="error"
    showIcon
    message={<Text>API key is invalid</Text>}
    className="mb-8"
    style={style}
  />
);
