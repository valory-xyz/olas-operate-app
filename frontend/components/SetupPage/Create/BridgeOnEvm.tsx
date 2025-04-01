import { Typography } from 'antd';

import { CardSection } from '@/components/styled/CardSection';

const { Text } = Typography;

export const BridgeOnEvm = () => {
  return (
    <CardSection padding="0px 24px">
      <Text className="text-base">
        Bridge funds from Ethereum to Base chain (Coming soon)
      </Text>
    </CardSection>
  );
};
