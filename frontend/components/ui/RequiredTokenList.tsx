import { Flex, Skeleton, Typography } from 'antd';
import Image from 'next/image';
import styled from 'styled-components';

import { COLOR } from '@/constants';
import { TokenRequirement } from '@/types';
import { formatAmountNormalized } from '@/utils/numberFormatters';

const { Text } = Typography;

const Container = styled(Flex)`
  flex-direction: column;
  background-color: ${COLOR.BACKGROUND};
  padding: 12px 16px;
  border-radius: 12px;
`;

type RequiredTokenListProps = {
  title?: string;
  tokenRequirements: TokenRequirement[];
  isLoading?: boolean;
  requirementsDisclaimer?: string;
};

export const RequiredTokenList = ({
  title,
  tokenRequirements,
  isLoading,
  requirementsDisclaimer = '',
}: RequiredTokenListProps) => {
  if (isLoading) {
    return (
      <>
        {title && <Text className="text-neutral-tertiary">{title}</Text>}
        <Container gap={12} className="mt-8">
          {[1, 2].map((i) => (
            <Skeleton.Input
              key={i}
              size="small"
              style={{ width: 180, height: 16 }}
              active
            />
          ))}
        </Container>
      </>
    );
  }

  if (!tokenRequirements?.length) return null;

  return (
    <>
      {title && <Text className="text-neutral-tertiary">{title}</Text>}
      <Container gap={12} className="mt-8">
        {tokenRequirements.map(({ amount, symbol, iconSrc }) => (
          <Flex key={symbol} align="center" gap={8} style={{ width: '100%' }}>
            <Image src={iconSrc} alt={symbol} height={20} width={20} />
            <Text>{`${formatAmountNormalized(amount)} ${symbol}`}</Text>
          </Flex>
        ))}

        {!!requirementsDisclaimer && (
          <Text className="text-neutral-tertiary" style={{ fontSize: 14 }}>
            {requirementsDisclaimer}
          </Text>
        )}
      </Container>
    </>
  );
};
