import { Flex, Skeleton, Statistic, Typography } from 'antd';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';

const { Text } = Typography;

dayjs.extend(duration);

const EstimatedTimeRow = styled(Flex)`
  .ant-statistic .ant-statistic-content .ant-statistic-content-prefix {
    margin-inline-end: 0 !important;
  }
  .ant-statistic .ant-statistic-content .ant-statistic-content-suffix {
    margin-inline-start: 0 !important;
  }
`;

const CountUp = () => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatted = dayjs.duration(seconds, 'seconds').format('HH:mm:ss');

  return (
    <Statistic
      value={formatted}
      valueRender={(value) => <Text type="secondary">{value}</Text>}
      prefix="("
      suffix=")"
      valueStyle={{ fontSize: '16px' }}
    />
  );
};

type EstimatedCompletionTimeProps = {
  isLoading?: boolean;
  timeInSeconds: number;
};

export const EstimatedCompletionTime = ({
  isLoading,
  timeInSeconds,
}: EstimatedCompletionTimeProps) => {
  const minutesRemaining = useMemo(() => {
    const minutes = Math.floor(timeInSeconds / 60);
    return Math.max(0, minutes);
  }, [timeInSeconds]);

  return (
    <EstimatedTimeRow gap={8} align="center">
      <Text type="secondary">Estimated completion time:</Text>
      {isLoading ? (
        <Skeleton.Input active size="small" style={{ width: 100 }} />
      ) : (
        <>
          <Text strong>
            ~ {minutesRemaining} minute{minutesRemaining === 1 ? '' : 's'}
          </Text>
          <CountUp />
        </>
      )}
    </EstimatedTimeRow>
  );
};
