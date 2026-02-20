import { ApiOutlined, HistoryOutlined } from '@ant-design/icons';
import { Button, Col, Flex, Row, Spin, Typography } from 'antd';
import Image from 'next/image';
import { CSSProperties, useMemo } from 'react';
import styled from 'styled-components';

import { CardFlex, Collapse, InfoTooltip } from '@/components/ui';
import { STAKING_PROGRAMS } from '@/config/stakingPrograms';
import {
  COLOR,
  EXPLORER_URL_BY_MIDDLEWARE_CHAIN,
  NA,
  UNICODE_SYMBOLS,
} from '@/constants';
import {
  Checkpoint,
  useRewardContext,
  useRewardsHistory,
  useServices,
} from '@/hooks';
import {
  balanceFormat,
  formatToMonthYear,
  formatToShortDateTime,
} from '@/utils';

const { Text, Title } = Typography;

const panelStyle: CSSProperties = {
  background: COLOR.WHITE,
};

const RewardRow = styled(Row)`
  padding: 12px 16px 12px 40px;
  border-top: 1px solid ${COLOR.GRAY_3};
  align-items: center;
`;

type Months = Array<{
  monthYear: string;
  checkpoints: Checkpoint[];
  totalMonthlyRewards: number;
}>;

/** Get current epoch details ie, in-progress epoch with accrued rewards */
const useCurrentEpochDetails = (lastCheckpoint?: Checkpoint) => {
  const { stakingRewardsDetails, optimisticRewardsEarnedForEpoch } =
    useRewardContext();

  return useMemo(() => {
    if (!stakingRewardsDetails || !lastCheckpoint) return;

    const { epochLength, epochEndTimeStamp, epoch } = lastCheckpoint;
    const { tsCheckpoint, isEligibleForRewards } = stakingRewardsDetails;

    const lastEpochEnd = tsCheckpoint >= epochEndTimeStamp;
    if (!lastEpochEnd) return;

    return {
      ...lastCheckpoint,
      blockTimestamp: `${tsCheckpoint + Number(epochLength)}`,
      earned: isEligibleForRewards,
      reward: isEligibleForRewards ? optimisticRewardsEarnedForEpoch || 0 : 0,
      epoch: `${Number(epoch) + 1}`,
      epochStartTimeStamp: tsCheckpoint,
      epochEndTimeStamp: tsCheckpoint + Number(epochLength),
      transactionHash: '', // no tx hash for in-progress epoch
    } satisfies Checkpoint;
  }, [stakingRewardsDetails, lastCheckpoint, optimisticRewardsEarnedForEpoch]);
};

/** Get checkpoints grouped by months */
const useCheckpointsByMonths = () => {
  const { allCheckpoints = [], isFetched } = useRewardsHistory();
  const currentEpochDetails = useCurrentEpochDetails(allCheckpoints[0]);

  const checkpointsByMonths = useMemo(() => {
    if (!isFetched) return [];

    const combinedCheckpoints: Checkpoint[] = currentEpochDetails
      ? [currentEpochDetails, ...allCheckpoints]
      : [...allCheckpoints];

    if (!combinedCheckpoints.length) return [];

    const months: Months = [];
    combinedCheckpoints.forEach((checkpoint) => {
      const epochEndTimeInMs = checkpoint.epochEndTimeStamp * 1000;
      const monthYear = formatToMonthYear(epochEndTimeInMs);

      const existingMonth = months.find((item) => item.monthYear === monthYear);
      if (existingMonth) {
        existingMonth.checkpoints.push(checkpoint);
        existingMonth.totalMonthlyRewards += checkpoint.reward;
      } else {
        months.push({
          monthYear,
          checkpoints: [checkpoint],
          totalMonthlyRewards: checkpoint.reward,
        });
      }
    });

    return months.sort(
      (a, b) =>
        b.checkpoints[0].epochEndTimeStamp - a.checkpoints[0].epochEndTimeStamp,
    );
  }, [allCheckpoints, isFetched, currentEpochDetails]);

  return checkpointsByMonths;
};

const EarnedRewardsColumn = ({
  rewards,
  className,
}: {
  rewards: number;
  className?: string;
}) => {
  const hasPositiveRewards = rewards > 0;
  return (
    <Flex align="center" gap={8}>
      <Image src="/tokens/olas-icon.png" alt="OLAS" height={20} width={20} />
      <Text
        className={`${className} ${hasPositiveRewards ? 'text-success-default' : 'text-neutral-primary'}`}
      >
        {hasPositiveRewards && '+'}
        {balanceFormat(rewards ?? 0, 2)} OLAS
      </Text>
    </Flex>
  );
};

const PanelHeader = ({
  monthYear,
  totalMonthlyRewards,
}: {
  monthYear: string;
  totalMonthlyRewards: number;
}) => {
  const [month, year] = monthYear.split(' ');
  return (
    <Flex align="center" justify="space-between" className="py-2">
      <Flex gap={12} align="center">
        <Text className="font-normal leading-24">{month}</Text>
        <Text className="text-sm text-neutral-tertiary leading-20">{year}</Text>
      </Flex>

      <EarnedRewardsColumn
        rewards={totalMonthlyRewards}
        className="leading-24"
      />
    </Flex>
  );
};

const EpochDurationPopup = ({ checkpoint }: { checkpoint: Checkpoint }) => {
  const { selectedAgentConfig } = useServices();
  const { middlewareHomeChainId } = selectedAgentConfig;
  const { transactionHash, epochStartTimeStamp, epochEndTimeStamp } =
    checkpoint;

  const timePeriod = useMemo(() => {
    if (epochStartTimeStamp && epochEndTimeStamp) {
      return `${formatToShortDateTime(epochStartTimeStamp * 1000)} - ${formatToShortDateTime(epochEndTimeStamp * 1000)} (UTC)`;
    }
    return NA;
  }, [epochStartTimeStamp, epochEndTimeStamp]);

  return (
    <Flex vertical gap={4} className="p-8">
      <Title level={5} className="text-sm m-0">
        Epoch duration
      </Title>
      <Text type="secondary" className="text-sm m-0">
        {timePeriod}
      </Text>
      {transactionHash && (
        <a
          href={`${EXPLORER_URL_BY_MIDDLEWARE_CHAIN[middlewareHomeChainId]}/tx/${transactionHash}`}
          target="_blank"
          className="text-sm"
        >
          End of epoch transaction {UNICODE_SYMBOLS.EXTERNAL_LINK}
        </a>
      )}
    </Flex>
  );
};

const CheckpointRow = ({ checkpoint }: { checkpoint: Checkpoint }) => {
  const { selectedAgentConfig } = useServices();
  const stakingProgramId = checkpoint.contractName;
  if (!stakingProgramId) return null;

  const stakingProgramMeta =
    STAKING_PROGRAMS[selectedAgentConfig.evmHomeChainId][stakingProgramId];
  return (
    <RewardRow key={checkpoint.epochEndTimeStamp}>
      <Col span={10} className="leading-20">
        <Text className="text-sm">{stakingProgramMeta.name}</Text>
      </Col>
      <Col span={4} className="leading-20">
        <Flex align="center" gap={4}>
          <Text className="text-sm text-neutral-tertiary">
            Epoch {checkpoint.epoch}
          </Text>
          <InfoTooltip placement="top">
            <EpochDurationPopup checkpoint={checkpoint} />
          </InfoTooltip>
        </Flex>
      </Col>
      <Col span={10} className="justify-items-end">
        <EarnedRewardsColumn
          rewards={checkpoint.reward}
          className="text-sm leading-20 "
        />
      </Col>
    </RewardRow>
  );
};

const LoadingHistory = () => (
  <CardFlex $noBorder>
    <Spin />
  </CardFlex>
);

const ErrorLoadingHistory = ({ refetch }: { refetch: () => void }) => (
  <CardFlex $noBorder>
    <Flex vertical gap={8} align="center" justify="center">
      <Text type="secondary">
        <ApiOutlined className="mr-4" /> Error loading rewards history.
      </Text>
      <Button size="small" onClick={refetch} className="mt-4 w-max-content">
        Try again
      </Button>
    </Flex>
  </CardFlex>
);

const NoRewards = () => (
  <CardFlex $noBorder>
    <Flex justify="center" gap={8}>
      <HistoryOutlined />
      <Text type="secondary">There’s no history of rewards yet.</Text>
    </Flex>
  </CardFlex>
);

export const RewardsHistory = () => {
  const { isError, isFetched, refetch } = useRewardsHistory();
  const checkpointsByMonths = useCheckpointsByMonths();

  if (!isFetched) return <LoadingHistory />;
  if (!checkpointsByMonths.length) return <NoRewards />;
  if (isError) return <ErrorLoadingHistory refetch={refetch} />;

  return (
    <CardFlex $noBorder $padding="16px">
      <Collapse
        bordered={false}
        defaultActiveKey={checkpointsByMonths[0].monthYear}
        size="large"
      >
        {checkpointsByMonths.map((month) => {
          return (
            <Collapse.Panel
              key={month.monthYear}
              style={panelStyle}
              header={
                <PanelHeader
                  monthYear={month.monthYear}
                  totalMonthlyRewards={month.totalMonthlyRewards}
                />
              }
            >
              {month.checkpoints.map((checkpoint) => (
                <CheckpointRow
                  key={checkpoint.epochEndTimeStamp}
                  checkpoint={checkpoint}
                />
              ))}
            </Collapse.Panel>
          );
        })}
      </Collapse>
    </CardFlex>
  );
};
