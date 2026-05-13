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

// Build interleaved indices for 2-column layout:
// grid position 0 -> word 1 (index 0), grid position 1 -> word 7 (index 6),
// grid position 2 -> word 2 (index 1), grid position 3 -> word 8 (index 7), etc.
const HALF = WORD_COUNT / 2;
const ORDERED_INDICES = Array.from({ length: WORD_COUNT }, (_, gridPos) => {
  const row = Math.floor(gridPos / 2);
  const col = gridPos % 2;
  return col === 0 ? row : row + HALF;
});

const WordGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
`;

const emptyWords = () => Array.from({ length: WORD_COUNT }, () => '');

export const EnterSecretRecoveryPhrase = () => {
  const { srpError, setSrpError, setSrpMnemonic, onNext, onPrev } =
    useAccountRecoveryContext();
  const [words, setWords] = useState<string[]>(emptyWords);
  const inputRefs = useRef<(InputRef | null)[]>([]);

  const allWordsFilled = words.every((w) => w.trim().length > 0);
  const isMnemonicValid =
    allWordsFilled && ethers.utils.isValidMnemonic(words.join(' '));

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
        const updated = [...words];
        pastedWords.forEach((word, i) => {
          const targetIndex = index + i;
          if (targetIndex < WORD_COUNT) {
            updated[targetIndex] = word;
          }
        });
        setWords(updated);
        if (srpError) setSrpError(undefined);

        // Focus the next unfilled input after paste
        const targetWordIndex = Math.min(
          index + pastedWords.length,
          WORD_COUNT - 1,
        );
        const targetGridPos = ORDERED_INDICES.indexOf(targetWordIndex);
        if (targetGridPos >= 0) inputRefs.current[targetGridPos]?.focus();
      }
    },
    [words, srpError, setSrpError],
  );

  const handleKeyDown = useCallback(
    (gridPosition: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        const next = gridPosition + 1;
        if (next < WORD_COUNT) {
          inputRefs.current[next]?.focus();
        }
      }
    },
    [],
  );

  const handleContinue = useCallback(() => {
    if (!isMnemonicValid) return;
    setSrpMnemonic(words.join(' '));
    onNext();
  }, [isMnemonicValid, words, setSrpMnemonic, onNext]);

  return (
    <CardFlex $gap={16} $padding="24px 32px" $noBorder>
      <BackButton onPrev={onPrev} />

      <Flex vertical gap={8}>
        <Title level={3} className="m-0">
          Enter Secret Recovery Phrase
        </Title>
        <Text className="text-neutral-secondary">
          Enter the 12-word secret recovery phrase for your Pearl account.
        </Text>
      </Flex>

      {srpError && (
        <Alert
          type="error"
          showIcon
          message={
            <Flex vertical gap={2}>
              <Text className="text-sm font-weight-600">
                Invalid Secret Recovery Phrase
              </Text>
              <Text className="text-sm">{srpError}</Text>
            </Flex>
          }
        />
      )}

      <WordGrid>
        {ORDERED_INDICES.map((wordIndex, gridPosition) => (
          <Input
            key={wordIndex}
            ref={(el) => {
              inputRefs.current[gridPosition] = el;
            }}
            value={words[wordIndex]}
            prefix={
              <Text type="secondary" style={{ fontSize: 12 }}>
                {wordIndex + 1}.
              </Text>
            }
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              handleWordChange(wordIndex, e.target.value)
            }
            onPaste={(e) => handlePaste(wordIndex, e)}
            onKeyDown={(e) => handleKeyDown(gridPosition, e)}
            autoComplete="off"
            spellCheck={false}
          />
        ))}
      </WordGrid>

      {allWordsFilled && !isMnemonicValid && (
        <Alert
          type="error"
          showIcon
          message={
            <span className="text-sm">
              Invalid recovery phrase. Please check each word and try again.
            </span>
          }
        />
      )}

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
  );
};
