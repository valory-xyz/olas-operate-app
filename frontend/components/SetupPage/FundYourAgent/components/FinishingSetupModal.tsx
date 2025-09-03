import { LoadingOutlined } from '@ant-design/icons';
import { Flex, Modal, ModalProps, Spin, Typography } from 'antd';

const { Title, Text } = Typography;

const MODAL_STYLES: ModalProps['styles'] = {
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

export const FinishingSetupModal = () => (
  <Modal open centered footer={null} styles={MODAL_STYLES} closable={false}>
    <Flex vertical align="center">
      <Spin indicator={<LoadingOutlined spin />} size="large" />
      <Title level={5} className="mt-24 mb-12">
        Finishing Setup
      </Title>
      <Text type="secondary" className="text-center">
        It usually takes a few minutes. Please keep the app open until the
        process is complete.
      </Text>
    </Flex>
  </Modal>
);
