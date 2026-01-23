import { Button, Flex, Typography } from 'antd';
import Image from 'next/image';
import { useMemo } from 'react';
import { LuSquareArrowOutUpRight } from 'react-icons/lu';
import styled from 'styled-components';

import { COLOR, EXPLORER_URL_BY_MIDDLEWARE_CHAIN } from '@/constants';
import { PolystratPayoutData } from '@/types/Achievement';

const { Title, Text } = Typography;

const MultiplierBadge = styled.div`
  padding: 4px 10px;
  border-radius: 10px;
  background: ${COLOR.PURPLE_LIGHT_3};
`;

const MarketCard = styled.div`
  border: 1px solid ${COLOR.GRAY_3};
`;

const StatsWrapper = styled(Flex)`
  border-top: 1px dashed ${COLOR.GRAY_3};
`;

const getTransactionUrl = (hash?: string) =>
  `${EXPLORER_URL_BY_MIDDLEWARE_CHAIN['polygon']}/tx/${hash}`;

const StatColumn = ({ stat }: { stat: { label: string; value?: string } }) => {
  if (!stat) return null;

  return (
    <Flex vertical key={stat.label}>
      <Text className="text-neutral-tertiary text-sm mb-2">{stat.label}</Text>
      <Text className="text-lg">{stat.value}</Text>
    </Flex>
  );
};

export const PolystratPayoutAchievement = ({
  payoutData,
}: {
  payoutData: PolystratPayoutData;
}) => {
  const stats = [
    {
      label: 'Position',
      value: payoutData.position,
    },
    {
      label: 'Amount',
      value: payoutData.amount_betted,
    },
    {
      label: 'Won',
      value: payoutData.payout,
    },
  ];

  const handleShareOnX = () => {
    // Placeholder for Share on X functionality
  };

  const payoutMultiplier = useMemo(() => {
    if (!payoutData.amount_betted || !payoutData.payout) return null;

    return (
      Number(payoutData.payout) / Number(payoutData.amount_betted)
    ).toFixed(2);
  }, [payoutData.amount_betted, payoutData.payout]);

  return (
    <Flex vertical align="center">
      <Image
        src={'/agent-polymarket_trader-icon.png'}
        width={56}
        height={56}
        alt="Polystrat"
        className="mb-24"
      />

      <MultiplierBadge className="mb-16">
        <Title level={2} className="m-0 text-primary font-weight-600">
          {payoutMultiplier}x
        </Title>
      </MultiplierBadge>

      <Text className="text-center mb-12 text-neutral-secondary">
        Your Polystrat made a high-return trade and collected{' '}
        <Text className="font-weight-600">{payoutData.payout}</Text>.
      </Text>

      {payoutData.transactionHash && (
        <a
          className="flex align-center text-sm gap-6 mb-24"
          target="_blank"
          rel="noopener noreferrer"
          href={getTransactionUrl(payoutData.transactionHash)}
        >
          View transaction <LuSquareArrowOutUpRight />
        </a>
      )}

      <MarketCard className="rounded-12">
        <Flex className="mx-16 mt-16 mb-20">
          <Text>{payoutData.question}</Text>
        </Flex>

        <StatsWrapper justify="space-between" className="px-16 pt-16 mb-12">
          {stats.map((stat) => (
            <StatColumn stat={stat} key={stat.label} />
          ))}
        </StatsWrapper>
      </MarketCard>

      <Button
        size="large"
        type="primary"
        className="w-full mt-24"
        onClick={handleShareOnX}
      >
        Share on X <LuSquareArrowOutUpRight />
      </Button>
    </Flex>
  );
};
