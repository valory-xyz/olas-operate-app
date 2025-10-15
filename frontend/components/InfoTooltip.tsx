import { InfoCircleOutlined } from '@ant-design/icons';
import Tooltip, { TooltipProps } from 'antd/es/tooltip';
import React from 'react';

import { COLOR } from '@/constants/colors';

const DEFAULT_ICON_STYLES = { color: COLOR.TEXT_LIGHT, cursor: 'pointer' };

export const InfoTooltip = ({
  placement = 'topLeft',
  children,
  size = 'small',
  iconStyles = DEFAULT_ICON_STYLES,
  overlayInnerStyle,
  ...rest
}: {
  children: React.ReactNode;
  iconStyles?: React.CSSProperties;
  size?: 'small' | 'medium';
  placement?: TooltipProps['placement'];
} & TooltipProps) => {
  const bodyWidth = size === 'medium' ? 360 : 250;

  return (
    <Tooltip
      arrow={false}
      title={children}
      placement={placement}
      overlayInnerStyle={{
        fontSize: 14,
        width: bodyWidth,
        ...overlayInnerStyle,
      }}
      {...rest}
    >
      <InfoCircleOutlined style={{ ...DEFAULT_ICON_STYLES, ...iconStyles }} />
    </Tooltip>
  );
};
