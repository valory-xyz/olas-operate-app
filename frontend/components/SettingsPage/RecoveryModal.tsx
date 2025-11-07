import { Alert, Button, Flex, Form, Input, Typography } from 'antd';
import { useCallback, useState } from 'react';
import { TbCopy, TbCopyCheck } from 'react-icons/tb';
import styled from 'styled-components';
import { useUnmount } from 'usehooks-ts';

import { COLOR } from '@/constants';
import { useMessageApi } from '@/context/MessageProvider';
import { useRecoveryPhraseBackup } from '@/hooks';
import { ValueOf } from '@/types';
import { copyToClipboard } from '@/utils';

import { Modal } from '../ui';
import { useRecoverySeedPhrase } from './useRecoverySeedPhrase';

const { Paragraph } = Typography;

const RecoveryWordContainer = styled.div`
  padding: 4px 8px;
  background-color: ${COLOR.GRAY_1};
  border-radius: 8px;
`;

const initialDescription =
  'The Secret Recovery Phrase provides full access to your Pearl wallet and agent funds.';
const recoveryPhraseDescription =
  "Store it in a safe place that only you can access and won't forget.";

type RecoveryPhraseStepProps = {
  phrase: string[];
  isCopied: boolean;
  onCopy: (isCopied: boolean) => void;
};
const RecoveryPhraseStep = ({
  phrase,
  isCopied,
  onCopy,
}: RecoveryPhraseStepProps) => {
  const message = useMessageApi();

  const handleCopy = useCallback(async () => {
    try {
      await copyToClipboard(phrase.join(' '));
      message.success('Recovery phrase copied!');
      onCopy(true);
    } catch (e) {
      message.error('Failed to copy recovery phrase.');
      console.error(e);
    }
  }, [phrase, message, onCopy]);

  return (
    <Flex vertical gap={12} className="mt-12">
      <Flex wrap gap={10}>
        {phrase.map((word: string, index: number) => (
          <RecoveryWordContainer key={`recovery-word-${index}`}>
            {word}
          </RecoveryWordContainer>
        ))}
      </Flex>
      <Button
        icon={isCopied ? <TbCopyCheck size={16} /> : <TbCopy size={16} />}
        onClick={handleCopy}
        type="primary"
        className="w-full text-sm mt-12"
      >
        {isCopied ? 'Copied' : 'Copy to Clipboard'}
      </Button>
    </Flex>
  );
};

const STEPS = {
  PASSWORD: 'password',
  RECOVERY_PHRASE: 'recoveryPhrase',
} as const;

type RecoveryModalProps = {
  open: boolean;
  onClose: () => void;
};

export const RecoveryModal = ({ open, onClose }: RecoveryModalProps) => {
  const [form] = Form.useForm();
  const { isLoading, getRecoverySeedPhrase, errorMessage } =
    useRecoverySeedPhrase();
  const { markAsBackedUp } = useRecoveryPhraseBackup();

  const [recoveryPhrase, setRecoveryPhrase] = useState<string[]>([]);
  const [step, setStep] = useState<ValueOf<typeof STEPS>>('password');
  const [isCopied, setIsCopied] = useState(false);

  const handleReveal = useCallback(
    async (values: { password: string }) => {
      try {
        const data = await getRecoverySeedPhrase(values.password);
        setRecoveryPhrase(data.mnemonic);
        setStep(STEPS.RECOVERY_PHRASE);
      } catch (e: unknown) {
        console.error(e);
      }
    },
    [setRecoveryPhrase, setStep, getRecoverySeedPhrase],
  );

  const onCopy = useCallback((copied: boolean) => {
    setIsCopied(copied);
  }, []);

  // Mark recovery phrase as backed up on unmount if it was copied to clipboard
  // and the recovery phrase exists.
  useUnmount(() => {
    if (recoveryPhrase && isCopied) {
      markAsBackedUp();
    }
  });

  const StepsAction =
    step === STEPS.PASSWORD ? (
      <>
        <Paragraph className="mt-8 mb-0 text-neutral-secondary">
          Enter your Pearl password to continue.
        </Paragraph>
        {errorMessage && (
          <Alert
            message={errorMessage}
            type="error"
            showIcon
            className="mt-12 w-full"
          />
        )}
        <Form
          form={form}
          onFinish={handleReveal}
          layout="vertical"
          className="w-full mt-12"
        >
          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password disabled={isLoading} />
          </Form.Item>

          <Flex justify="flex-end" gap={12} className="w-full">
            <Button onClick={onClose}>Cancel</Button>
            <Form.Item className="mb-0">
              <Button
                type="primary"
                htmlType="submit"
                className="w-full"
                loading={isLoading}
              >
                Reveal Recovery Phrase
              </Button>
            </Form.Item>
          </Flex>
        </Form>
      </>
    ) : (
      <RecoveryPhraseStep
        phrase={recoveryPhrase}
        isCopied={isCopied}
        onCopy={onCopy}
      />
    );

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title="Secret Recovery Phrase"
      description={
        step === 'password' ? initialDescription : recoveryPhraseDescription
      }
      action={StepsAction}
      size="small"
      destroyOnHidden
      closable
    />
  );
};
