import {
  CheckCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { Alert as AlertAntd, AlertProps as AntdAlertProps } from 'antd';

type AlertType = 'primary' | 'info' | 'warning' | 'error' | 'success';

const icons = {
  primary: <InfoCircleOutlined />,
  info: <InfoCircleOutlined />,
  warning: <WarningOutlined />,
  error: <WarningOutlined />,
  success: <CheckCircleOutlined />,
};

type AlertProps = {
  type: AlertType;
  fullWidth?: boolean;
  centered?: boolean;
  className?: string;
} & Omit<AntdAlertProps, 'type'>;

function getAlertClassName(
  type: string,
  fullWidth?: boolean,
  centered?: boolean,
  className?: string,
) {
  return [
    'custom-alert',
    `custom-alert--${type}`,
    fullWidth && 'custom-alert--full-width',
    centered && 'custom-alert--centered',
    className,
  ]
    .filter(Boolean)
    .join(' ');
}

export const Alert = ({
  type,
  fullWidth,
  centered,
  className,
  ...rest
}: AlertProps) => (
  <AlertAntd
    type={type === 'primary' ? undefined : type}
    className={getAlertClassName(type, fullWidth, centered, className)}
    icon={rest.showIcon ? icons[type] : undefined}
    {...rest}
  />
);
