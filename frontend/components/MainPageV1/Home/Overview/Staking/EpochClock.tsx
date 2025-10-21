import { Flex, Statistic, Typography } from 'antd';
import { TbClock } from 'react-icons/tb';
import styled from 'styled-components';

import { COLOR } from '@/constants';
import { useStakingDetails } from '@/hooks';

const { Text } = Typography;
const { Timer } = Statistic;

type ClockProps = {
  color?: 'danger' | 'warning';
};

const colorMap: Record<'danger' | 'warning', string> = {
  danger: COLOR.ICON_COLOR.DANGER,
  warning: COLOR.ICON_COLOR.WARNING,
};

const IconWrapper = styled.div<{ color: string }>`
  display: flex;
  padding: 3px;
  border-radius: 6px;
  background-color: color-mix(
    in srgb,
    ${({ color }) => color},
    transparent 90%
  );
`;

const ClockIcon = ({ color }: ClockProps) => {
  const fillColor = color ? colorMap[color] : COLOR.TEXT_NEUTRAL_TERTIARY;

  return (
    <IconWrapper color={fillColor}>
      <TbClock size={18} color={fillColor} />
    </IconWrapper>
  );
};

const DANGER_HOURS = 3;
const WARNING_HOURS = 12;

export const EpochClock = () => {
  const { currentEpochLifetime } = useStakingDetails();

  const getClockColor = (): 'danger' | 'warning' | undefined => {
    if (!currentEpochLifetime) return;

    const hoursLeft = (currentEpochLifetime - Date.now()) / (1000 * 60 * 60);

    if (hoursLeft < DANGER_HOURS) return 'danger';
    if (hoursLeft < WARNING_HOURS) return 'warning';
    return;
  };

  return (
    <Flex align="center" gap={8}>
      {currentEpochLifetime ? (
        <>
          <ClockIcon color={getClockColor()} />
          <Timer
            type="countdown"
            value={currentEpochLifetime}
            valueStyle={{ fontSize: 16 }}
          />
        </>
      ) : (
        <Text>Soon</Text>
      )}
    </Flex>
  );
};
