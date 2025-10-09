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
  width?: number;
  action?: React.ReactNode;
  align?: 'center' | 'left' | 'right';
};

export const Modal = ({
  header = null,
  title,
  description,
  width = 452,
  action = null,
  align = 'center',
  ...props
}: ModalProps & AntdModalProps) => {
  const flexAlignMap: Record<
    'center' | 'left' | 'right',
    'center' | 'flex-start' | 'flex-end'
  > = {
    center: 'center',
    left: 'flex-start',
    right: 'flex-end',
  };

  const textAlignClassMap: Record<'center' | 'left' | 'right', string> = {
    center: 'text-center',
    left: 'text-left',
    right: 'text-right',
  };

  const flexAlign = flexAlignMap[align];
  const textAlignClass = textAlignClassMap[align];

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
