import { InfoCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { Alert as AlertAntd, AlertProps } from 'antd';

type AlertType = 'primary' | 'info' | 'warning' | 'error';

const icons = {
  primary: <InfoCircleOutlined />,
  info: <InfoCircleOutlined />,
  warning: <WarningOutlined />,
  error: <WarningOutlined />,
};

type CustomAlertProps = {
  type: AlertType;
  fullWidth?: boolean;
  centered?: boolean;
  className?: string;
} & Omit<AlertProps, 'type'>;

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

export const CustomAlert = ({
  type,
  fullWidth,
  centered,
  className,
  ...rest
}: CustomAlertProps) => (
  <AlertAntd
    type={type === 'primary' ? undefined : type}
    className={getAlertClassName(type, fullWidth, centered, className)}
    icon={rest.showIcon ? icons[type] : undefined}
    {...rest}
  />
);
