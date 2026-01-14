import { Flex, Typography } from 'antd';
import { LuLockKeyhole } from 'react-icons/lu';

const { Title, Text, Link } = Typography;

export const RestrictedRegion = () => {
  return (
    <Flex
      vertical
      align="center"
      justify="center"
      gap={16}
      className="p-24 text-center"
    >
      <LuLockKeyhole />
      <Title level={4} className="m-0">
        Agent Unavailable
      </Title>
      <Text className="text-neutral-tertiary">
        Trading with the Polymarket Prediction Agent isn’t available in your
        region. If you’re using a VPN, turn it off and try again.
      </Text>
      <Link
        target="_blank"
        rel="noopener noreferrer"
        href="https://docs.polymarket.com/polymarket-learn/FAQ/geoblocking#close-only-countries "
      >
        Learn about regional availability
      </Link>
    </Flex>
  );
};
