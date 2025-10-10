import { Button, Flex, Image, Typography } from 'antd';
import styled from 'styled-components';

import { WalletOutlined } from '@/components/custom-icons';
import { NumberInput } from '@/components/ui/NumberInput';
import { COLOR } from '@/constants/colors';
import { TokenSymbol, TokenSymbolConfigMap } from '@/constants/token';
import { formatNumber } from '@/utils/numberFormatters';

const { Text } = Typography;

const Container = styled.div<{ $hasError?: boolean }>`
  width: 100%;
  border-radius: 16px;
  border: 1px solid
    ${({ $hasError }) =>
      $hasError ? COLOR.TEXT_COLOR.ERROR.DEFAULT : COLOR.GRAY_4};
  background-color: ${COLOR.BACKGROUND};
  .input-wrapper {
    padding: 16px 20px;
    border-radius: 16px;
    background-color: ${COLOR.WHITE};
  }
`;

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

type TokenAmountInputProps = {
  value: number;
  /** Maximum amount that can be entered */
  maxAmount?: number;
  /** Total amount available (for display only) */
  totalAmount: number;
  onChange: (value: number | null) => void;
  tokenSymbol: TokenSymbol;
  /** Whether to show quick select buttons (10%, 25%, 50%, 100%) */
  showQuickSelects?: boolean;
  /** Whether the input has an error */
  hasError?: boolean;
};

export const TokenAmountInput = ({
  value,
  maxAmount,
  totalAmount,
  onChange,
  tokenSymbol,
  showQuickSelects = true,
  hasError = false,
}: TokenAmountInputProps) => (
  <Container $hasError={hasError}>
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
        max={maxAmount}
        variant="borderless"
        size="large"
        controls={false}
        style={{ flex: 1 }}
      />
      <TokenImage tokenSymbol={tokenSymbol} />
    </Flex>

    <Flex
      className="token-value-and-helper w-full"
      justify="space-between"
      align="center"
      style={{ padding: '10px 20px' }}
    >
      <Flex gap={6} align="center">
        <WalletOutlined width={20} height={20} />
        <Text className="text-sm leading-normal text-neutral-tertiary">
          {formatNumber(totalAmount, 4)}
        </Text>
      </Flex>

      {showQuickSelects && (
        <Flex gap={8} align="center">
          {[10, 25, 50, 100].map((percentage) => (
            <Button
              key={percentage}
              onClick={() => {
                if (percentage === 100) {
                  onChange(totalAmount);
                } else {
                  onChange(
                    Number(((totalAmount * percentage) / 100).toFixed(4)),
                  );
                }
              }}
              type="text"
              size="small"
              className="text-neutral-tertiary"
              style={{ padding: '0 4px' }}
            >
              {percentage}%
            </Button>
          ))}
        </Flex>
      )}
    </Flex>
  </Container>
);
