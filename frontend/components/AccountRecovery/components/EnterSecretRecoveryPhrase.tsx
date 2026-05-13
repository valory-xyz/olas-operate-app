import { Button, Flex, Input, InputRef, Typography } from 'antd';
import { ethers } from 'ethers';
import {
  ChangeEvent,
  ClipboardEvent,
  useCallback,
  useRef,
  useState,
} from 'react';
import styled from 'styled-components';

import { Alert, BackButton, CardFlex } from '@/components/ui';

import { useAccountRecoveryContext } from '../AccountRecoveryProvider';

const { Title, Text } = Typography;

const WORD_COUNT = 12;
const COLUMN_COUNT = 2;
const ROW_COUNT = WORD_COUNT / COLUMN_COUNT;

const FormCard = styled.div`
  width: 600px;
  margin: auto;
`;

const WordGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(${COLUMN_COUNT}, 1fr);
  grid-template-rows: repeat(${ROW_COUNT}, auto);
  grid-auto-flow: column;
  gap: 16px;
`;

const emptyWords = () => Array.from({ length: WORD_COUNT }, () => '');

export const EnterSecretRecoveryPhrase = () => {
  const { srpError, setSrpError, setSrpMnemonic, onNext, onPrev } =
    useAccountRecoveryContext();
  const [words, setWords] = useState<string[]>(emptyWords);
  const inputRefs = useRef<(InputRef | null)[]>([]);

  const normalizedWords = words.map((w) => w.trim().toLowerCase());
  const normalizedMnemonic = normalizedWords.join(' ');
  const allWordsFilled = normalizedWords.every((w) => w.length > 0);
  const isMnemonicValid =
    allWordsFilled && ethers.utils.isValidMnemonic(normalizedMnemonic);

  const handleWordChange = useCallback(
    (index: number, value: string) => {
      const updated = [...words];
      updated[index] = value;
      setWords(updated);
      if (srpError) setSrpError(undefined);
    },
    [words, srpError, setSrpError],
  );

  const handlePaste = useCallback(
    (index: number, e: ClipboardEvent<HTMLInputElement>) => {
      const pasted = e.clipboardData.getData('text');
      const pastedWords = pasted.trim().split(/\s+/);

      if (pastedWords.length > 1) {
        e.preventDefault();
        // A full-phrase paste (12 words) overwrites the whole grid from
        // index 0 regardless of which input has focus — otherwise pasting
        // into input N would silently drop the last N words.
        const startIndex = pastedWords.length === WORD_COUNT ? 0 : index;
        const updated = [...words];
        pastedWords.forEach((word, i) => {
          const targetIndex = startIndex + i;
          if (targetIndex < WORD_COUNT) {
            updated[targetIndex] = word;
          }
        });
        setWords(updated);
        if (srpError) setSrpError(undefined);

        // Focus the next unfilled input after paste
        const targetIndex = Math.min(
          startIndex + pastedWords.length,
          WORD_COUNT - 1,
        );
        inputRefs.current[targetIndex]?.focus();
      }
    },
    [words, srpError, setSrpError],
  );

  const handleKeyDown = useCallback(
    (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        const next = index + 1;
        if (next < WORD_COUNT) {
          inputRefs.current[next]?.focus();
        }
      }
    },
    [],
  );

  const handleContinue = useCallback(() => {
    if (!isMnemonicValid) return;
    setSrpMnemonic(normalizedMnemonic);
    onNext();
  }, [isMnemonicValid, normalizedMnemonic, setSrpMnemonic, onNext]);

  const showInvalidAlert = !!srpError || (allWordsFilled && !isMnemonicValid);

  return (
    <FormCard>
      <CardFlex $gap={24} $padding="32px" $noBorder>
        <Flex vertical gap={16}>
          <BackButton onPrev={onPrev} />
          <Flex vertical gap={12}>
            <Title level={3} className="m-0">
              Enter Secret Recovery Phrase
            </Title>
            <Text className="text-neutral-secondary">
              Enter the 12-word recovery phrase of your Pearl account to reset
              password. Pearl neither stores nor has access to your secret
              recovery phrase.
            </Text>
          </Flex>
        </Flex>

        {showInvalidAlert && (
          <Alert
            type="error"
            showIcon
            message={
              <Flex vertical gap={2}>
                <Text className="text-sm font-weight-600">
                  Invalid Secret Recovery Phrase
                </Text>
                <Text className="text-sm">
                  {srpError ?? 'Please review your input and try again.'}
                </Text>
              </Flex>
            }
          />
        )}

        <WordGrid>
          {words.map((value, wordIndex) => (
            <Input
              key={wordIndex}
              ref={(el) => {
                inputRefs.current[wordIndex] = el;
              }}
              value={value}
              size="large"
              prefix={
                <Text type="secondary" style={{ fontSize: 16 }}>
                  {wordIndex + 1}.
                </Text>
              }
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                handleWordChange(wordIndex, e.target.value)
              }
              onPaste={(e) => handlePaste(wordIndex, e)}
              onKeyDown={(e) => handleKeyDown(wordIndex, e)}
              autoComplete="off"
              spellCheck={false}
            />
          ))}
        </WordGrid>

        <Button
          type="primary"
          size="large"
          block
          disabled={!isMnemonicValid}
          onClick={handleContinue}
        >
          Continue
        </Button>
      </CardFlex>
    </FormCard>
  );
};
