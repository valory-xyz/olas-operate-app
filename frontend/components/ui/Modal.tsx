import {
  Flex,
  Modal as AntdModal,
  ModalProps as AntdModalProps,
  Typography,
} from 'antd';

const { Title, Text } = Typography;

const MODAL_STYLES: AntdModalProps['styles'] = {
  content: {
    width: '452px',
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
  action?: React.ReactNode;
};

export const Modal = ({
  header = null,
  title,
  description,
  action = null,
  ...props
}: ModalProps & AntdModalProps) => {
  return (
    <AntdModal
      open
      centered
      footer={null}
      styles={MODAL_STYLES}
      closable={false}
      {...props}
    >
      <Flex vertical align="center">
        {header}
        <Title level={5} className="mt-32 mb-12">
          {title}
        </Title>
        <Text type="secondary" className="text-center">
          {description}
        </Text>
        {action}
      </Flex>
    </AntdModal>
  );
};
