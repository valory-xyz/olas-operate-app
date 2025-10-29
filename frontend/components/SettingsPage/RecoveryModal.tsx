import { Button, Flex, Input, message, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { TbCopy, TbCopyCheck } from 'react-icons/tb';
import styled from 'styled-components';

import { BACKEND_URL, COLOR, CONTENT_TYPE_JSON_UTF8 } from '@/constants';
import { useValidatePassword } from '@/hooks';
import { copyToClipboard } from '@/utils';

import { Modal } from '../ui';

const { Paragraph } = Typography;

const RecoveryWordContainer = styled.div`
  padding: 4px 8px;
  background-color: ${COLOR.GRAY_1};
  border-radius: 8px;
`;

type RecoveryModalProps = {
  open: boolean;
  onClose: () => void;
};

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
    <Flex vertical gap={12} className="mt-12 ">
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

type PasswordFooterProps = {
  isValid: boolean;
  isLoading: boolean;
  onCancel: () => void;
  onReveal: () => void;
};

const PasswordFooter = ({
  isValid,
  isLoading,
  onCancel,
  onReveal,
}: PasswordFooterProps) => {
  return (
    <Flex justify="flex-end" gap={12} className="w-full">
      <Button onClick={onCancel}>Cancel</Button>
      <Button
        type="primary"
        disabled={!isValid || isLoading}
        loading={isLoading}
        onClick={onReveal}
      >
        Reveal Recovery Phrase
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

export const RecoveryModal = ({ open, onClose }: RecoveryModalProps) => {
  const [step, setStep] = useState<ModalStep>('password');
  const [password, setPassword] = useState('');
  const [recoveryPhrase, setRecoveryPhrase] = useState<string[]>([]);
  const [isCopied, setIsCopied] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const { isLoading, validatePassword } = useValidatePassword();

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setStep('password');
      setPassword('');
      setRecoveryPhrase([]);
      setIsCopied(false);
      setIsValid(false);
    }
  }, [open]);

  useEffect(() => {
    if (!password || step !== 'password') {
      setIsValid(false);
      return;
    }

    const validate = async () => {
      const result = await validatePassword(password);
      setIsValid(result);
    };

    const timeoutId = setTimeout(validate, 500);
    return () => clearTimeout(timeoutId);
  }, [password, step, validatePassword]);

  const handleReveal = async () => {
    const result = await validatePassword(password);
    if (!result) return;

    try {
      const data = await getRecoverySeedPhrase(password);
      const mnemonic = data.mnemonic || '';
      if (mnemonic) {
        setRecoveryPhrase(mnemonic);
        setStep('recoveryPhrase');
      } else {
        throw new Error('Recovery phrase not found in response');
      }
    } catch (e) {
      alert('Failed to retrieve recovery phrase. Please try again later.');
      console.error(e);
    }
  };

  const handleCopy = async () => {
    await copyToClipboard(recoveryPhrase.join(' '));
    message.success('Recovery phrase copied!');
    setIsCopied(true);

    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  };

  const initialDescription =
    'The Secret Recovery Phrase provides full access to your Pearl wallet and agent funds.';
  const recoveryPhraseDescription =
    "Store it in a safe place that only you can access and won't forget.";

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
          <PasswordFooter
            isValid={isValid}
            isLoading={isLoading}
            onCancel={onClose}
            onReveal={handleReveal}
          />
        ) : null
      }
    />
  );
};
