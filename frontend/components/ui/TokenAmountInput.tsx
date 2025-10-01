import { Button, Flex, Image, Typography } from 'antd';
import styled from 'styled-components';

import { WalletOutlined } from '@/components/custom-icons';
import { NumberInput } from '@/components/ui/NumberInput';
import { COLOR } from '@/constants/colors';
import { TokenSymbol, TokenSymbolConfigMap } from '@/constants/token';
import { formatNumber } from '@/utils/numberFormatters';

const { Text } = Typography;

type TokenAmountInputProps = {
  value: number;
  totalAmountInUsd: number;
  totalAmount: number;
  onChange: (value: number | null) => void;
  tokenSymbol: TokenSymbol;
};

const TokenImage = ({ tokenSymbol }: { tokenSymbol: TokenSymbol }) => (
  <Flex gap={8} align="center">
    <Image
      src={TokenSymbolConfigMap[tokenSymbol].image}
      alt={tokenSymbol}
      width={20}
      className="flex"
    />
    <Text className="text-lg">{tokenSymbol}</Text>
  </Flex>
);

const Container = styled.div`
  width: 100%;
  border-radius: 16px;
  border: 1px solid ${COLOR.GRAY_4};
  background-color: ${COLOR.BACKGROUND};
  .input-wrapper {
    padding: 16px 20px;
    border-radius: 16px;
    background-color: ${COLOR.WHITE};
  }
`;

export const TokenAmountInput = ({
  totalAmountInUsd,
  totalAmount,
  value,
  onChange,
  tokenSymbol,
}: TokenAmountInputProps) => (
  <Container>
    <Flex
      className="input-wrapper"
      gap={12}
      align="center"
      justify="space-between"
    >
      <NumberInput
        onChange={onChange}
        value={value}
        min={0}
        max={totalAmount}
        variant="borderless"
        size="large"
        controls={false}
        style={{ flex: 1 }}
      />
      <TokenImage tokenSymbol={tokenSymbol} />
    </Flex>

    <Flex
      className="token-value-and-helper"
      justify="space-between"
      align="center"
      style={{ padding: '10px 20px' }}
    >
      <Text className="text-sm leading-normal text-neutral-tertiary">
        {totalAmountInUsd ? `≈ $${formatNumber(totalAmountInUsd, 4)}` : null}
      </Text>

      <Flex align="center" gap={24}>
        <Flex gap={8} align="center">
          {[10, 25, 50, 100].map((percentage) => (
            <Button
              key={percentage}
              onClick={() =>
                onChange(Number(((totalAmount * percentage) / 100).toFixed(4)))
              }
              type="text"
              size="small"
              className="text-neutral-tertiary"
              style={{ padding: '0 4px' }}
            >
              {percentage}%
            </Button>
          ))}
        </Flex>
        <Flex gap={6} align="center">
          <WalletOutlined width={20} height={20} />
          <Text className="text-sm leading-normal text-neutral-tertiary">
            {formatNumber(totalAmount, 4)}
          </Text>
        </Flex>
      </Flex>
    </Flex>
  </Container>
);
