import { Button as AntdButton } from 'antd';
import { useState } from 'react';
import { TbRefresh } from 'react-icons/tb';
import styled from 'styled-components';
import { useInterval } from 'usehooks-ts';

import { COLOR } from '@/constants';

import { QUOTE_COUNTDOWN_TICK } from './constants';

const Button = styled(AntdButton)`
  background: ${COLOR.GRAY_1};
`;

const secondsUntil = (unixSeconds: number) =>
  Math.max(0, unixSeconds - Math.floor(Date.now() / 1000));

/** `m:ss`, e.g. 162 → "2:42". */
export const formatMinutesSeconds = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

type QuoteCountdownProps = {
  /** Unix seconds of the next automatic re-quote. */
  nextRefreshAt: number;
  onRefresh: () => void;
  isRefreshing: boolean;
};

export const QuoteCountdown = ({
  nextRefreshAt,
  onRefresh,
  isRefreshing,
}: QuoteCountdownProps) => {
  const [, setTick] = useState(0);
  useInterval(() => setTick((tick) => tick + 1), QUOTE_COUNTDOWN_TICK);

  return (
    <Button
      size="small"
      type="text"
      onClick={onRefresh}
      loading={isRefreshing}
      icon={<TbRefresh />}
      iconPosition="end"
      aria-label="Refresh quote"
    >
      Quote update in {formatMinutesSeconds(secondsUntil(nextRefreshAt))}
    </Button>
  );
};
