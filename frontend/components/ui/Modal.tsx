import {
  Flex,
  Modal as AntdModal,
  ModalProps as AntdModalProps,
  Typography,
} from 'antd';

const { Title, Text } = Typography;

const MODAL_STYLES: AntdModalProps['styles'] = {
  content: {
    minHeight: '264px',
    padding: '32px',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
};

type ModalProps = {
  header?: React.ReactNode | null;
  title: string;
  description: string;
  size?: 'small' | 'medium';
  action?: React.ReactNode;
};

export const Modal = ({
  header = null,
  title,
  description,
  size = 'medium',
  action = null,
  ...props
}: ModalProps & AntdModalProps) => {
  let flexAlign = 'center';
  let textAlignClass = 'text-center';
  let width = 450;

  if (size === 'small') {
    flexAlign = 'flex-start';
    textAlignClass = 'text-left';
    width = 400;
  }

  return (
    <AntdModal
      open
      centered
      footer={null}
      width={width}
      styles={MODAL_STYLES}
      closable={false}
      {...props}
    >
      <Flex vertical align={flexAlign} style={{ width: '100%' }}>
        {header}
        <Title level={5} className={`mt-24 mb-12 ${textAlignClass}`}>
          {title}
        </Title>
        <Text type="secondary" className={textAlignClass}>
          {description}
        </Text>
        {action}
      </Flex>
    </AntdModal>
  );
};
