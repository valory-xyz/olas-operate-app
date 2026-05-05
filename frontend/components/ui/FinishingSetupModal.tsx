import { Spin } from 'antd';

import { LoadingOutlined } from '@/components/custom-icons';

import { Modal } from './Modal';

export const FinishingSetupModal = () => (
  <Modal
    header={<Spin indicator={<LoadingOutlined />} size="large" />}
    title="Finishing Setup"
    description="It usually takes a few minutes. Please keep the app open until the process is complete."
  />
);
