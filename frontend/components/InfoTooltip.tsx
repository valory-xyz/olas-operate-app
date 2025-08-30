import { InfoCircleOutlined } from '@ant-design/icons';
import Tooltip, { TooltipProps } from 'antd/es/tooltip';

import { COLOR } from '@/constants/colors';

const DEFAULT_ICON_STYLES = { color: COLOR.TEXT_LIGHT, cursor: 'pointer' };

export const InfoTooltip = ({
  placement = 'topLeft',
  children,
  iconStyles = DEFAULT_ICON_STYLES,
  ...rest
}: {
  children: React.ReactNode;
  iconStyles?: React.CSSProperties;
} & TooltipProps) => (
  <Tooltip arrow={false} title={children} placement={placement} {...rest}>
    <InfoCircleOutlined style={{ ...DEFAULT_ICON_STYLES, ...iconStyles }} />
  </Tooltip>
);
