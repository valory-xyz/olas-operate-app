import Tooltip, { TooltipProps } from 'antd/es/tooltip';
import { ReactNode } from 'react';
import { LuInfo } from 'react-icons/lu';

import { COLOR } from '@/constants/colors';

const DEFAULT_ICON_STYLES = { cursor: 'pointer' };

export const InfoTooltip = ({
  placement = 'topLeft',
  children,
  size = 'small',
  iconSize = 16,
  iconColor = COLOR.TEXT_NEUTRAL_TERTIARY,
  overlayInnerStyle,
  ...rest
}: {
  children: ReactNode;
  iconSize?: number;
  iconColor?: string;
  size?: 'small' | 'medium';
  placement?: TooltipProps['placement'];
} & TooltipProps) => {
  const bodyWidth = size === 'medium' ? 360 : 250;

  return (
    <Tooltip
      arrow={false}
      title={children}
      placement={placement}
      overlayInnerStyle={{ width: bodyWidth, ...overlayInnerStyle }}
      {...rest}
    >
      <LuInfo size={iconSize} color={iconColor} style={DEFAULT_ICON_STYLES} />
    </Tooltip>
  );
};
