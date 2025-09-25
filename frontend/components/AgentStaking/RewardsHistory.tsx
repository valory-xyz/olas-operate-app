import { Col, Flex, Image, Row, Typography } from 'antd';
import { CSSProperties, useMemo } from 'react';
import styled from 'styled-components';

import { CardFlex } from '@/components/ui/CardFlex';
import { Collapse } from '@/components/ui/Collapse';
import { STAKING_PROGRAMS } from '@/config/stakingPrograms';
import { COLOR } from '@/constants';
import { Checkpoint, useRewardsHistory, useServices } from '@/hooks';

const { Text } = Typography;

const panelStyle: CSSProperties = {
  background: COLOR.WHITE,
};

const RewardRow = styled(Row)`
  padding: 12px 16px 12px 36px;
  border-top: 1px solid ${COLOR.GRAY_3};
  align-items: center;
`;

const useCheckoutPointsByMonths = () => {
  /**
   * TODO: check if we should use "allCheckpoints" instead???
   */
  const { contractCheckpoints = {}, isLoading } = useRewardsHistory();

  const checkpointsByMonths = useMemo(() => {
    if (!Object.entries(contractCheckpoints).length || isLoading) return [];
    const monthsArray = Object.values(contractCheckpoints)
      .flat()
      .reduce(
        (acc, checkpoint) => {
          const epochEndTimeInMs = checkpoint.epochEndTimeStamp * 1000;
          const date = new Date(epochEndTimeInMs);
          const monthYear = date.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
            timeZone: 'UTC',
          });

          const existingMonth = acc.find(
            (item) => item.monthYear === monthYear,
          );
          if (existingMonth) {
            existingMonth.checkpoints.push(checkpoint);
            existingMonth.totalMonthlyRewards += checkpoint.reward;
          } else {
            acc.push({
              monthYear,
              checkpoints: [checkpoint],
              totalMonthlyRewards: checkpoint.reward,
            });
          }
          return acc;
        },
        [] as Array<{
          monthYear: string;
          checkpoints: Checkpoint[];
          totalMonthlyRewards: number;
        }>,
      );

    return monthsArray.sort(
      (a, b) =>
        b.checkpoints[0].epochEndTimeStamp - a.checkpoints[0].epochEndTimeStamp,
    );
  }, [contractCheckpoints, isLoading]);

  return checkpointsByMonths;
};

const EarnedRewardsColumn = ({
  rewards,
  hasRewards,
  className,
}: {
  rewards: number;
  hasRewards: boolean;
  className?: string;
}) => (
  <Flex align="center" gap={8}>
    <Image
      src="/tokens/olas-icon.png"
      alt="OLAS"
      height={20}
      className="flex"
    />
    <Text
      className={`${className} ${hasRewards ? 'text-success-default' : 'text-neutral-primary'}`}
    >
      {hasRewards && '+'}
      {rewards.toFixed(2)} OLAS
    </Text>
  </Flex>
);

const PanelHeader = ({
  monthYear,
  totalMonthlyRewards,
}: {
  monthYear: string;
  totalMonthlyRewards: number;
}) => {
  const [month, year] = monthYear.split(' ');
  const hasRewards = totalMonthlyRewards > 0;
  return (
    <Flex align="center" justify="space-between" className="py-2">
      <Flex gap={12} align="center">
        <Text className="font-normal leading-24">{month}</Text>
        <Text className="text-sm text-neutral-tertiary leading-20">{year}</Text>
      </Flex>

      <EarnedRewardsColumn
        rewards={totalMonthlyRewards}
        hasRewards={hasRewards}
        className="leading-24"
      />
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
        <Text className="text-sm text-neutral-tertiary">
          Epoch {checkpoint.epoch}
        </Text>
      </Col>
      <Col span={10} className="justify-items-end">
        <EarnedRewardsColumn
          rewards={checkpoint.reward}
          hasRewards={checkpoint.earned}
          className="text-sm leading-20 "
        />
      </Col>
    </RewardRow>
  );
};

export const RewardsHistory = () => {
  const checkpointsByMonths = useCheckoutPointsByMonths();
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
