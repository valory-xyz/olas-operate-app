import { Typography } from 'antd';
import { CSSProperties } from 'react';

import { Alert } from '@/components/ui';

const { Text } = Typography;

type InvalidGeminiApiCredentialsProps = {
  style?: CSSProperties;
};

export const InvalidGeminiApiCredentials = ({
  style,
}: InvalidGeminiApiCredentialsProps) => (
  <Alert
    type="error"
    showIcon
    message={<Text>API key is invalid</Text>}
    className="mb-8"
    style={style}
  />
);
