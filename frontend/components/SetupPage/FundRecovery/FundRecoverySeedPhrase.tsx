import { Alert, Button, Flex, Input, InputRef, Typography } from 'antd';
import { ChangeEvent, ClipboardEvent, useCallback, useRef } from 'react';
import styled from 'styled-components';

const { Title, Text } = Typography;

const WordGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
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

const EVM_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/;

const isValidEvmAddress = (address: string): boolean =>
  EVM_ADDRESS_REGEX.test(address);

type FundRecoverySeedPhraseProps = {
  wordCount: 12 | 24;
  words: string[];
  destinationAddress: string;
  isScanning: boolean;
  onWordsChange: (words: string[]) => void;
  onDestinationAddressChange: (address: string) => void;
  onWordCountToggle: () => void;
  onScan: () => void;
};

export const FundRecoverySeedPhrase = ({
  wordCount,
  words,
  destinationAddress,
  isScanning,
  onWordsChange,
  onDestinationAddressChange,
  onWordCountToggle,
  onScan,
}: FundRecoverySeedPhraseProps) => {
  const inputRefs = useRef<(InputRef | null)[]>([]);

  const allWordsFilled = words.every((w) => w.trim().length > 0);
  const isAddressValid = isValidEvmAddress(destinationAddress);
  const canScan = allWordsFilled && isAddressValid;

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
          if (targetIndex < wordCount) {
            updated[targetIndex] = word;
          }
        });
        onWordsChange(updated);

        // Focus the next unfilled input after paste
        const nextIndex = Math.min(index + pastedWords.length, wordCount - 1);
        inputRefs.current[nextIndex]?.focus();
      }
    },
    [words, wordCount, onWordsChange],
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        const next = index + 1;
        if (next < wordCount) {
          inputRefs.current[next]?.focus();
        }
      }
    },
    [wordCount],
  );

  return (
    <Flex vertical gap={24}>
      <Flex vertical gap={8}>
        <Title level={4} className="m-0">
          Recover funds with recovery phrase
        </Title>
        <Text type="secondary">
          Enter your 12 or 24-word recovery phrase and a destination address to
          receive recovered funds.
        </Text>
      </Flex>

      <Flex vertical gap={12}>
        <Flex justify="space-between" align="center">
          <Text strong>Recovery phrase ({wordCount} words)</Text>
          <Button type="link" size="small" onClick={onWordCountToggle}>
            Switch to {wordCount === 12 ? '24' : '12'} words
          </Button>
        </Flex>

        <WordGrid>
          {words.map((word, index) => (
            <WordInputWrapper key={index}>
              <WordNumber>{index + 1}.</WordNumber>
              <Input
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                value={word}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  handleWordChange(index, e.target.value)
                }
                onPaste={(e) => handlePaste(index, e)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                size="small"
                autoComplete="off"
                spellCheck={false}
              />
            </WordInputWrapper>
          ))}
        </WordGrid>
      </Flex>

      <Flex vertical gap={8}>
        <Text strong>Destination address</Text>
        <Input
          value={destinationAddress}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onDestinationAddressChange(e.target.value)
          }
          placeholder="0x..."
          size="large"
          status={
            destinationAddress && !isAddressValid ? 'error' : undefined
          }
        />
        {destinationAddress && !isAddressValid && (
          <Text type="danger" style={{ fontSize: 12 }}>
            Please enter a valid EVM address (0x followed by 40 hex characters)
          </Text>
        )}
      </Flex>

      <Alert
        type="warning"
        showIcon
        message="Security notice"
        description="Your recovery phrase is only held in memory during this session and is never stored on disk or sent to any server other than your local Pearl backend."
      />

      <Button
        type="primary"
        size="large"
        block
        disabled={!canScan}
        loading={isScanning}
        onClick={onScan}
      >
        Scan for recoverable funds
      </Button>
    </Flex>
  );
};

