import { Flex, Skeleton, Statistic, Typography } from 'antd';
import React, { useMemo } from 'react';
import styled from 'styled-components';

const { Text } = Typography;
const { Countdown } = Statistic;

const EstimatedTimeRow = styled(Flex)`
  .ant-statistic .ant-statistic-content .ant-statistic-content-prefix {
    margin-inline-end: 0 !important;
  }
  .ant-statistic .ant-statistic-content .ant-statistic-content-suffix {
    margin-inline-start: 0 !important;
  }
`;

type EstimatedCompletionTimeProps = {
  isLoading?: boolean;
  timeInSeconds: number;
};

export const EstimatedCompletionTime = ({
  isLoading,
  timeInSeconds,
}: EstimatedCompletionTimeProps) => {
  const deadline = useMemo(() => {
    if (!timeInSeconds) return 0;
    return new Date(timeInSeconds * 1000).getTime();
  }, [timeInSeconds]);

  const minutesRemaining = useMemo(() => {
    if (!deadline) return 0;
    const minutes = Math.floor((deadline - new Date().getTime()) / 1000 / 60);
    return Math.max(0, minutes);
  }, [deadline]);

  return (
    <EstimatedTimeRow gap={8}>
      <Text type="secondary">Estimated completion time:</Text>
      {isLoading ? (
        <Skeleton.Input active size="small" style={{ width: 100 }} />
      ) : (
        <>
          <Text strong>
            ~ {minutesRemaining} minute{minutesRemaining === 1 ? '' : 's'}
          </Text>
          <Text type="secondary">
            <Countdown
              value={deadline}
              format="HH:mm:ss"
              valueStyle={{ fontSize: '16px' }}
              style={{ display: 'inline-block' }}
              prefix={'('}
              suffix={')'}
            />
          </Text>
        </>
      )}
    </EstimatedTimeRow>
  );
};
