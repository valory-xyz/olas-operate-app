import { Button, Flex, Input, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { TbCopy, TbCopyCheck } from 'react-icons/tb';
import styled from 'styled-components';

import { BACKEND_URL, COLOR, CONTENT_TYPE_JSON_UTF8 } from '@/constants';
import { useMessageApi } from '@/context/MessageProvider';
import { useRecoveryPhraseBackup, useValidatePassword } from '@/hooks';
import { copyToClipboard } from '@/utils';

import { Modal } from '../ui';

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

type PasswordStepProps = {
  password: string;
  setPassword: (value: string) => void;
  isValidating: boolean;
};
const PasswordStep = ({
  password,
  setPassword,
  isValidating,
}: PasswordStepProps) => {
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
      <Input.Password
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={isValidating}
        id="recovery-password"
      />
    </>
  );
};

type RecoveryPhraseStepProps = {
  recoveryPhrase: string[];
  isCopied: boolean;
  onCopy: () => void;
};
const RecoveryPhraseStep = ({
  recoveryPhrase,
  isCopied,
  onCopy,
}: RecoveryPhraseStepProps) => {
  return (
    <Flex vertical gap={12} className="mt-12">
      <Flex wrap gap={10}>
        {recoveryPhrase.map((word: string, index: number) => (
          <RecoveryWordContainer key={`recovery-word-${index}`}>
            {word}
          </RecoveryWordContainer>
        ))}
      </Flex>
      <Button
        icon={isCopied ? <TbCopyCheck size={17} /> : <TbCopy size={17} />}
        onClick={onCopy}
        type="primary"
        className="w-full text-sm mt-12"
      >
        {isCopied ? 'Copied' : 'Copy to Clipboard'}
      </Button>
    </Flex>
  );
};

/**
 * API call to get recovery seed phrase
 */
const getRecoverySeedPhrase = async (password: string) =>
  fetch(`${BACKEND_URL}/wallet/mnemonic`, {
    method: 'POST',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
    body: JSON.stringify({ ledger_type: 'ethereum', password }),
  }).then((res) => {
    if (res.ok) return res.json();
    throw new Error('Failed to get recovery seed phrase');
  });

type ModalStep = 'password' | 'recoveryPhrase';

type RecoveryModalProps = {
  open: boolean;
  onClose: () => void;
};

export const RecoveryModal = ({ open, onClose }: RecoveryModalProps) => {
  const message = useMessageApi();
  const [step, setStep] = useState<ModalStep>('password');
  const [password, setPassword] = useState('');
  const [recoveryPhrase, setRecoveryPhrase] = useState<string[]>([]);
  const [isCopied, setIsCopied] = useState(false);
  const { isLoading, validatePassword } = useValidatePassword();
  const { markAsBackedUp } = useRecoveryPhraseBackup();

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setStep('password');
      setPassword('');
      setRecoveryPhrase([]);
      setIsCopied(false);
    }
  }, [open]);

  const handleReveal = useCallback(async () => {
    try {
      const result = await validatePassword(password);
      if (!result) return;

      const data = await getRecoverySeedPhrase(password);
      const mnemonic = data.mnemonic || '';
      if (mnemonic) {
        // mnemonic may be returned as a string or array; normalize to string[]
        const words = Array.isArray(mnemonic)
          ? mnemonic
          : String(mnemonic).split(/\s+/).filter(Boolean);
        setRecoveryPhrase(words);
        setStep('recoveryPhrase');
      } else {
        throw new Error('Recovery phrase not found in response');
      }
    } catch (e) {
      message.error(
        'Failed to retrieve recovery phrase. Please try again later.',
      );
      console.error(e);
    }
  }, [password, validatePassword, message, setRecoveryPhrase, setStep]);

  const handleCopy = useCallback(async () => {
    try {
      await copyToClipboard(recoveryPhrase.join(' '));
      message.success('Recovery phrase copied!');
      setIsCopied(true);
      markAsBackedUp();

      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (e) {
      message.error('Failed to copy recovery phrase.');
      console.error(e);
    }
  }, [recoveryPhrase, message, markAsBackedUp]);

  return (
    <Modal
      size="small"
      open={open}
      onCancel={onClose}
      title="Secret Recovery Phrase"
      description={
        step === 'password' ? initialDescription : recoveryPhraseDescription
      }
      closable
      action={
        step === 'password' ? (
          <PasswordStep
            password={password}
            setPassword={setPassword}
            isValidating={isLoading}
          />
        ) : (
          <RecoveryPhraseStep
            recoveryPhrase={recoveryPhrase}
            isCopied={isCopied}
            onCopy={handleCopy}
          />
        )
      }
      footer={
        step === 'password' ? (
          <Flex justify="flex-end" gap={12} className="w-full">
            <Button onClick={onClose}>Cancel</Button>
            <Button
              type="primary"
              disabled={!password || password.length === 0}
              loading={isLoading}
              onClick={handleReveal}
            >
              Reveal Recovery Phrase
            </Button>
          </Flex>
        ) : null
      }
    />
  );
};
