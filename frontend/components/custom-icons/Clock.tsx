import { TbClock } from 'react-icons/tb';
import styled from 'styled-components';

import { COLOR } from '@/constants';

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

export const Clock = ({ color }: ClockProps) => {
  const fillColor = color ? colorMap[color] : COLOR.TEXT_NEUTRAL_TERTIARY;

  return (
    <IconWrapper color={fillColor}>
      <TbClock size={18} color={fillColor} />
    </IconWrapper>
  );
};
