import { Alert, Button, Flex, Input, InputRef, Typography } from 'antd';
import { ChangeEvent, ClipboardEvent, useCallback, useRef } from 'react';
import styled from 'styled-components';

const { Title, Text } = Typography;

const WORD_COUNT = 12;

const WordGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
`;

const WordInputWrapper = styled(Flex)`
  align-items: center;
  gap: 4px;
`;

const WordNumber = styled(Text)`
  min-width: 20px;
  text-align: right;
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
`;

type FundRecoverySeedPhraseProps = {
  words: string[];
  isScanning: boolean;
  scanError?: string | null;
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
  const canScan = allWordsFilled;

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

  // Reorder words for 2-column layout: left column words 1-6, right column words 7-12
  const orderedIndices = Array.from({ length: WORD_COUNT }, (_, i) => {
    const half = WORD_COUNT / 2;
    const col = Math.floor(i / half);
    const row = i % half;
    return col === 0 ? row : row + half;
  });

  return (
    <Flex vertical gap={24}>
      <Flex vertical gap={8}>
        <Title level={4} className="m-0">
          Withdraw Funds
        </Title>
        <Text type="secondary">
          Enter your 12-word recovery phrase to scan for recoverable balances.
        </Text>
      </Flex>

      {scanError && (
        <Alert
          type="error"
          showIcon
          message={scanError}
          style={{ borderRadius: 8 }}
        />
      )}

      <Flex vertical gap={12}>
        <Text strong>Recovery phrase (12 words)</Text>
        <WordGrid>
          {orderedIndices.map((wordIndex, gridPosition) => (
            <WordInputWrapper key={wordIndex}>
              <WordNumber>{wordIndex + 1}.</WordNumber>
              <Input
                ref={(el) => {
                  inputRefs.current[gridPosition] = el;
                }}
                value={words[wordIndex]}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  handleWordChange(wordIndex, e.target.value)
                }
                onPaste={(e) => handlePaste(wordIndex, e)}
                onKeyDown={(e) => handleKeyDown(gridPosition, e)}
                size="small"
                autoComplete="off"
                spellCheck={false}
              />
            </WordInputWrapper>
          ))}
        </WordGrid>
      </Flex>

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
