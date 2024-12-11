import { Alert } from 'antd';

export const FeatureNotEnabled = () => (
  <Alert
    message="Oops!"
    description="This feature is not enabled for your current agent type."
    type="error"
    showIcon
    style={{ border: 'none' }}
  />
);
