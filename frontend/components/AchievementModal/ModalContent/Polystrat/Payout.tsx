import { Button, Flex, Typography } from 'antd';
import { capitalize, isNil } from 'lodash';
import Image from 'next/image';
import { useCallback, useMemo } from 'react';
import { LuSquareArrowOutUpRight } from 'react-icons/lu';
import styled from 'styled-components';

import { COLOR, EXPLORER_URL_BY_MIDDLEWARE_CHAIN, NA } from '@/constants';
import { Achievement } from '@/types/Achievement';
import { formatAmountNormalized } from '@/utils';

import {
  generateXIntentUrl,
  getPredictWebsiteAchievementUrl,
} from '../../utils';

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

type StatColumnProps = {
  label: string;
  value?: string;
};

const StatColumn = ({ label, value }: StatColumnProps) => {
  if (!value) return null;

  return (
    <Flex vertical key={label}>
      <Text className="text-neutral-tertiary text-sm mb-2">{label}</Text>
      <Text className="text-lg">{value}</Text>
    </Flex>
  );
};

type PolystratModalContentProps = {
  achievement: Achievement;
  onShare?: () => void;
};

export const PolystratPayoutAchievement = ({
  achievement,
  onShare,
}: PolystratModalContentProps) => {
  const { description = NA, achievement_type: type, data } = achievement ?? {};
  const {
    id: betId,
    market,
    prediction_side: position,
    bet_amount = 0,
    total_payout,
    transaction_hash,
  } = data ?? {};

  const question = market?.title ?? NA;
  const totalPayout = total_payout ?? null;
  const totalPayoutFormatted = isNil(totalPayout)
    ? null
    : formatAmountNormalized(totalPayout, 2);
  const totalPayoutText = isNil(totalPayoutFormatted)
    ? NA
    : `$${totalPayoutFormatted}`;

  const handleShareOnX = useCallback(() => {
    const [, polystratAchievementType] = type.split('/');
    const predictUrl = getPredictWebsiteAchievementUrl(
      'polystrat',
      new URLSearchParams({ betId, type: polystratAchievementType }),
    );
    const postText = description.replace('{achievement_url}', predictUrl);
    const xIntentUrl = generateXIntentUrl(postText);
    window.open(xIntentUrl, '_blank', 'noopener,noreferrer');
    onShare?.();
  }, [description, type, betId, onShare]);

  const stats = useMemo(
    () => [
      { label: 'Position', value: capitalize(position) },
      { label: 'Amount', value: `$${formatAmountNormalized(bet_amount, 2)}` },
      { label: 'Won', value: totalPayoutText },
    ],
    [position, bet_amount, totalPayoutText],
  );

  const payoutMultiplier = useMemo(() => {
    if (!totalPayout || !bet_amount) return null;
    return formatAmountNormalized(totalPayout / bet_amount, 2);
  }, [bet_amount, totalPayout]);

  return (
    <Flex vertical align="center">
      <Image
        src={'/agent-polymarket_trader-icon.png'}
        width={56}
        height={56}
        alt="Polystrat"
        className="mb-24"
      />

      {payoutMultiplier && (
        <MultiplierBadge className="mb-16">
          <Title level={2} className="m-0 text-primary font-weight-600">
            {payoutMultiplier}x
          </Title>
        </MultiplierBadge>
      )}

      <Text className="text-center mb-12 text-neutral-secondary">
        Your Polystrat made a high-return trade and collected{' '}
        <Text className="font-weight-600">{totalPayoutText}</Text>.
      </Text>

      {transaction_hash && (
        <a
          className="flex align-center text-sm gap-6 mb-24"
          target="_blank"
          rel="noopener noreferrer"
          href={getTransactionUrl(transaction_hash)}
        >
          View transaction <LuSquareArrowOutUpRight />
        </a>
      )}

      <MarketCard className="rounded-12">
        <Flex className="mx-16 mt-16 mb-20">
          <Text>{question}</Text>
        </Flex>

        <StatsWrapper justify="space-between" className="px-16 pt-16 mb-12">
          {stats.map((stat) => (
            <StatColumn key={stat.label} {...stat} />
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
