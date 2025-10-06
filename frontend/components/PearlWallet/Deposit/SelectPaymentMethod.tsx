import { Flex, Typography } from 'antd';

import { BackButton } from '@/components/ui';

const { Title, Text } = Typography;

const SelectPaymentMethodTitle = () => (
  <Flex vertical justify="space-between" gap={12}>
    <Title level={4} className="m-0">
      Select Payment Method
    </Title>
    <Text>Enter the token amounts you want to deposit.</Text>
  </Flex>
);

export const SelectPaymentMethod = ({ onBack }: { onBack: () => void }) => {
  return (
    <Flex vertical gap={24} style={{ width: '100%' }}>
      <BackButton onPrev={onBack} />
      <SelectPaymentMethodTitle />
    </Flex>
  );
};
