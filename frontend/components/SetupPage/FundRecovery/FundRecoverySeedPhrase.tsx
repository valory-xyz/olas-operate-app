import { Button, Flex, Input, InputRef, Typography } from 'antd';
import { ChangeEvent, ClipboardEvent, useCallback, useRef } from 'react';
import styled from 'styled-components';

import { Alert } from '@/components/ui';

const { Title, Text } = Typography;

const WORD_COUNT = 12;

const WordGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
`;

type FundRecoverySeedPhraseProps = {
  words: string[];
  isScanning: boolean;
  scanError?: boolean;
  onWordsChange: (words: string[]) => void;
  onScan: () => void;
};

export const FundRecoverySeedPhrase = ({
  words,
  isScanning,
  scanError,
  onWordsChange,
  onScan,
}: FundRecoverySeedPhraseProps) => {
  const inputRefs = useRef<(InputRef | null)[]>([]);

  const allWordsFilled = words.every((w) => w.trim().length > 0);
  const canScan = allWordsFilled && !isScanning;

  const handleWordChange = useCallback(
    (index: number, value: string) => {
      const updated = [...words];
      updated[index] = value;
      onWordsChange(updated);
    },
    [words, onWordsChange],
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
        onWordsChange(updated);

        // Focus the next unfilled input after paste
        const nextIndex = Math.min(index + pastedWords.length, WORD_COUNT - 1);
        inputRefs.current[nextIndex]?.focus();
      }
    },
    [words, onWordsChange],
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        const next = index + 1;
        if (next < WORD_COUNT) {
          inputRefs.current[next]?.focus();
        }
      }
    },
    [],
  );

  // Build interleaved indices for 2-column layout:
  // grid position 0 → word 1 (index 0), grid position 1 → word 7 (index 6),
  // grid position 2 → word 2 (index 1), grid position 3 → word 8 (index 7), etc.
  const half = WORD_COUNT / 2;
  const orderedIndices = Array.from({ length: WORD_COUNT }, (_, gridPos) => {
    const row = Math.floor(gridPos / 2);
    const col = gridPos % 2;
    return col === 0 ? row : row + half;
  });

  return (
    <Flex vertical gap={24}>
      <Flex vertical gap={8}>
        <Title level={3} className="m-0">
          Withdraw Funds
        </Title>
        <Text type="secondary">
          Enter the 12-word recovery phrase of the lost Pearl account to
          withdraw funds to an external wallet. Pearl neither stores nor has
          access to your secret recovery phrase.
        </Text>
      </Flex>

      {scanError && (
        <Alert
          type="error"
          showIcon
          message={
            <span className="text-sm">
              Invalid Secret Recovery Phrase. Please review your input and try
              again.
            </span>
          }
        />
      )}

      <WordGrid>
        {orderedIndices.map((wordIndex, gridPosition) => (
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

      <Button
        type="primary"
        size="large"
        block
        disabled={!canScan}
        loading={isScanning}
        onClick={onScan}
      >
        Continue
      </Button>
    </Flex>
  );
};
