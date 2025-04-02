import { Button, Typography } from 'antd';
import { useCallback } from 'react';

import { CardSection } from '@/components/styled/CardSection';

const { Text } = Typography;

// TODO
export const BridgeOnEvm = () => {
  const handleBridgeFunds = useCallback(() => {
    window.console.log('Bridge funds');
  }, []);

  return (
    <CardSection padding="0px 24px" vertical gap={16}>
      <Text className="text-base">
        Bridge from Ethereum directly to your agent. No further funds will be
        needed after bridging.
      </Text>
      <Button onClick={handleBridgeFunds} block type="primary" size="large">
        Bridge funds
      </Button>
    </CardSection>
  );
};
