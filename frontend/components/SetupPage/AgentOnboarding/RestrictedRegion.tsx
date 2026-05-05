import { Flex, Typography } from 'antd';
import { LuGlobeLock } from 'react-icons/lu';
import { styled } from 'styled-components';

import { COLOR, GEO_ELIGIBILITY_DOCS_URL } from '@/constants';

const { Title, Text, Link } = Typography;

const IconWrapper = styled(Flex)`
  width: 64px;
  height: 64px;
  border-radius: 12px;
  border: 1px solid ${COLOR.PURPLE_LIGHT_4};
  background-color: ${COLOR.WHITE};
  transition: background-color 0.2s ease-in-out;
  background: url('/empty-icon-background.svg') no-repeat center center;
  background-size: cover;
`;

export const RestrictedRegion = () => {
  return (
    <Flex
      vertical
      align="center"
      justify="center"
      gap={16}
      className="p-24 text-center"
    >
      <IconWrapper justify="center" align="center">
        <LuGlobeLock size={32} color={COLOR.TEXT_NEUTRAL_TERTIARY} />
      </IconWrapper>
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
        href={GEO_ELIGIBILITY_DOCS_URL}
      >
        Learn about regional availability
      </Link>
    </Flex>
  );
};
