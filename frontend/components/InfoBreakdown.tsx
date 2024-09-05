import { CSSProperties, ReactNode } from 'react';
import styled from 'styled-components';

import { COLOR } from '@/constants/colors';

type Size = 'small' | 'default' | 'large';
type Color = 'default' | 'primary';

const Breakdown = styled.div`
  display: flex;
  flex-direction: column;
`;

const BreakdownLine = styled.div<{ size?: Size }>`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: ${({ size }: { size?: Size }) => {
    switch (size) {
      case 'small':
        return '14px';
      case 'large':
        return '16px';
      default:
        return 'inherit';
    }
  }};
  color: ${COLOR.TEXT};
  width: 100%;
  gap: 12px;
`;

const Line = styled.span<{ color?: Color }>`
  flex: 1;
  border-top: ${({ color }: { color?: Color }) =>
    `1px solid ${color === 'primary' ? COLOR.PURPLE_LIGHT : COLOR.BORDER_GRAY}`};
`;

type Info = { id?: number | string; left: ReactNode; right: ReactNode };
type InfoBreakdownListProps = {
  list: Info[];
  parentStyle?: CSSProperties;
  size?: Size;
  color?: Color;
};

export const InfoBreakdownList = ({
  list,
  parentStyle,
  size,
  color,
}: InfoBreakdownListProps) => (
  <Breakdown style={parentStyle}>
    {list.map((item, index) => (
      <BreakdownLine key={item.id || index} size={size}>
        <span>{item.left}</span>
        <Line color={color} />
        <span className="font-weight-600">{item.right}</span>
      </BreakdownLine>
    ))}
  </Breakdown>
);
