import { Typography } from 'antd';

import { CustomAlert } from '@/components/Alert';

const { Text } = Typography;

export const InvalidGeminiApiCredentials = () => (
  <CustomAlert
    type="error"
    showIcon
    message={<Text>API key is invalid</Text>}
    className="mb-8"
  />
);
