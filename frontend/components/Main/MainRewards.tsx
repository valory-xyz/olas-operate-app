import { InfoCircleOutlined } from '@ant-design/icons';
import { Flex, Skeleton, Tag, Tooltip, Typography } from 'antd';

import { balanceFormat } from '@/common-util';
import { useBalance } from '@/hooks';
import { useReward } from '@/hooks/useReward';

import { CardSection } from '../styled/CardSection';

const { Text, Paragraph } = Typography;

const Loader = () => (
  <Flex vertical gap={8}>
    <Skeleton.Button active size="small" style={{ width: 92 }} />
    <Skeleton.Button active size="small" style={{ width: 92 }} />
  </Flex>
);

export const MainRewards = () => {
  const { availableRewardsForEpochEth, isEligibleForRewards } = useReward();
  const { isBalanceLoaded } = useBalance();

  return (
    <CardSection vertical gap={8} padding="16px 24px" align="start">
      <Text type="secondary">
        Staking rewards this work period&nbsp;
        <Tooltip
          arrow={false}
          title={
            <Paragraph className="text-sm m-0">
              The agent&apos;s working period lasts at least 24 hours, but its
              start and end point may not be at the same time every day.
            </Paragraph>
          }
        >
          <InfoCircleOutlined />
        </Tooltip>
      </Text>
      {isBalanceLoaded ? (
        <Flex align="center" gap={12}>
          <Text className="text-xl font-weight-600">
            {balanceFormat(availableRewardsForEpochEth, 2)} OLAS&nbsp;
          </Text>
          {isEligibleForRewards ? (
            <Tag color="success">Earned</Tag>
          ) : (
            <Tag color="processing">Not yet earned</Tag>
          )}
        </Flex>
      ) : (
        <Loader />
      )}
    </CardSection>
  );
};
