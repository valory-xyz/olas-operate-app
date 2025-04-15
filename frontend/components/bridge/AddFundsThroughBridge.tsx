import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Flex, Typography } from 'antd';

import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';

import { CardFlex } from '../styled/CardFlex';

const { Title, Text } = Typography;

export const AddFundsThroughBridge = () => {
  const { goto } = usePageState();

  return (
    <CardFlex
      gap={20}
      noBorder
      styles={{
        header: { minHeight: 56 },
        body: { padding: '0 24px' },
      }}
      title={
        <Flex gap={16} align="center">
          <Button
            onClick={() => goto(Pages.Main)}
            icon={<ArrowLeftOutlined />}
          />
          <Title level={5} className="m-0">
            Bridge from Ethereum
          </Title>
        </Flex>
      }
    >
      <Text>
        Specify the amount of tokens you&apos;d like to receive to your Pearl
        Safe.
      </Text>

      <Flex gap={8} vertical>
        <Text className="font-sm">Amount to receive</Text>
        <Button
          type="primary"
          size="large"
          onClick={() => goto(Pages.Main)}
          disabled // TODO: Mohan to update
        >
          Bridge funds
        </Button>
      </Flex>
    </CardFlex>
  );
};
