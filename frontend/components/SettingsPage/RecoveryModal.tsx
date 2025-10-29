import { Button, Flex, Input, Typography } from 'antd';

import { COLOR } from '@/constants';

import { Modal } from '../ui';

const { Paragraph } = Typography;

type RecoveryModalProps = {
  open: boolean;
  onClose: () => void;
};

const description =
  'The Secret Recovery Phrase provides full access to your Pearl wallet and agent funds.';

const getPassword = () => {
  return (
    <>
      <Paragraph className="mt-8 text-neutral-secondary">
        Enter your Pearl password to continue.
      </Paragraph>
      <label
        className="text-sm text-neutral-secondary mb-4"
        htmlFor="recovery-password"
      >
        Password <span style={{ color: COLOR.RED }}>*</span>
      </label>
      <Input required />
    </>
  );
};

const footer = () => {
  return (
    <Flex justify="flex-end" gap={12} className="w-full">
      <Button onClick={() => {}}>Cancel</Button>
      <Button type="primary" disabled onClick={() => {}}>
        Reveal Recovery Phrase
      </Button>
    </Flex>
  );
};

export const RecoveryModal = ({ open, onClose }: RecoveryModalProps) => {
  return (
    <Modal
      size="small"
      open={open}
      onCancel={onClose}
      title="Secret Recovery Phrase"
      description={description}
      closable
      action={getPassword()}
      footer={footer}
    />
  );
};
