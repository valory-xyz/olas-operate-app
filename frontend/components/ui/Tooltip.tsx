import { Tooltip as AntdTooltip, TooltipProps } from 'antd';

const overlayInnerStyle: React.CSSProperties = {
  fontSize: 14,
  padding: '12px 16px',
  borderRadius: 16,
  boxShadow:
    '0px 2px 5px 0px rgba(115, 132, 156, 0.1), 0px 9px 9px 0px rgba(115, 132, 156, 0.09)',
};

export const Tooltip = (props: TooltipProps) => {
  const { overlayInnerStyle: overlayInnerStyleProps, ...rest } = props;

  return (
    <AntdTooltip
      arrow={false}
      overlayInnerStyle={{ ...overlayInnerStyle, ...overlayInnerStyleProps }}
      {...rest}
    />
  );
};
