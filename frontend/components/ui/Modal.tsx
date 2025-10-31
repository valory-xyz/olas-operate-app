import {
  Flex,
  Modal as AntdModal,
  ModalProps as AntdModalProps,
  Typography,
} from 'antd';
import { ReactNode } from 'react';

const { Title, Text } = Typography;

type ModalSize = 'small' | 'medium' | 'large';

const modalStylesMap: Record<
  ModalSize,
  {
    width: number;
    padding: number;
    flexAlign: 'center' | 'flex-start';
    textAlignClass: string;
  }
> = {
  small: {
    width: 400,
    padding: 24,
    flexAlign: 'flex-start',
    textAlignClass: 'text-left',
  },
  medium: {
    width: 450,
    padding: 32,
    flexAlign: 'center',
    textAlignClass: 'text-center',
  },
  large: {
    width: 640,
    padding: 32,
    flexAlign: 'flex-start',
    textAlignClass: 'text-left',
  },
} as const;

const MODAL_STYLES: AntdModalProps['styles'] = {
  content: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    borderRadius: '12px',
  },
};

type ModalProps = {
  header?: ReactNode;
  title?: string;
  description?: ReactNode;
  size?: ModalSize;
  action?: ReactNode;
};

export const Modal = ({
  header = null,
  title,
  description,
  size = 'medium',
  action = null,
  closable = false,
  ...props
}: ModalProps & AntdModalProps) => {
  const sizeStyles = modalStylesMap[size];

  return (
    <AntdModal
      open
      centered
      footer={null}
      width={sizeStyles.width}
      styles={{
        content: {
          ...MODAL_STYLES.content,
          minHeight: size === 'small' ? undefined : '264px',
          padding: `${sizeStyles.padding}px`,
        },
        footer: { marginTop: 24 },
      }}
      closable={closable}
      {...props}
    >
      <Flex vertical align={sizeStyles.flexAlign} style={{ width: '100%' }}>
        {header}
        {title && (
          <Title
            level={5}
            className={`${header ? 'mt-24' : 'mt-0'} mb-12 ${sizeStyles.textAlignClass}`}
          >
            {title}
          </Title>
        )}
        <Text type="secondary" className={sizeStyles.textAlignClass}>
          {description}
        </Text>
        {action}
      </Flex>
    </AntdModal>
  );
};
