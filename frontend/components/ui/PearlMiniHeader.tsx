import { Flex, Typography } from 'antd';
import Image from 'next/image';

const { Text } = Typography;

export const PearlMiniHeader = () => {
  return (
    <Flex justify="center" align="center" gap={8}>
      <Image
        src="/onboarding-robot.svg"
        alt="logo"
        width={24}
        height={24}
        style={{ marginTop: -2 }}
      />
      <Text>Pearl</Text>
    </Flex>
  );
};
