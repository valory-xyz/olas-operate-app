import { Button, Flex, Image, InputNumber, Typography } from 'antd';
import styled from 'styled-components';

import { TokenSymbol, TokenSymbolConfigMapV2 } from '@/constants/token';
import { formatNumber } from '@/utils/numberFormatters';

const { Text } = Typography;

type TokenAmountInputProps = {
  value: number;
  totalAmountInUsd: number;
  totalAmount: number;
  onChange: (value: number | null) => void;
  tokenSymbol: TokenSymbol;
};

const Container = styled.div`
  border: 1px solid red;
  border-radius: 16px;
  background-color: lightgray;
  width: 100%;
  .input-wrapper {
    padding: 24px 20px;
    border-radius: 16px;
    background-color: white;
  }
  .token-value-and-helper {
    padding: 10px 20px;
  }
`;

export const TokenAmountInput = ({
  totalAmountInUsd,
  totalAmount,
  value,
  onChange,
  tokenSymbol,
}: TokenAmountInputProps) => {
  return (
    <Container>
      <Flex
        className="input-wrapper"
        gap={12}
        align="center"
        justify="space-between"
      >
        <InputNumber
          variant="borderless"
          size="large"
          value={value}
          min={0}
          max={totalAmount}
          style={{
            // width: '100%'
            flex: 1,
          }}
          onChange={onChange}
        />
        <Flex gap={8} align="center">
          <Image
            width={20}
            src={TokenSymbolConfigMapV2[tokenSymbol].image}
            alt={tokenSymbol}
            style={{ display: 'flex' }}
          />
          <Text className="text-lg">{tokenSymbol}</Text>
        </Flex>
      </Flex>

      <Flex
        className="token-value-and-helper"
        justify="space-between"
        align="center"
      >
        <Text type="secondary" className="text-sm">
          ${formatNumber(totalAmountInUsd)}
        </Text>
        <Flex gap={8}>
          {[10, 25, 50, 100].map((percentage) => (
            <Button
              key={percentage}
              type="text"
              size="small"
              style={{ padding: '0 4px' }}
              onClick={() => onChange((totalAmount * percentage) / 100)}
            >
              {percentage}%
            </Button>
          ))}

          <Text type="secondary" className="text-sm">
            {formatNumber(totalAmount)}
          </Text>
        </Flex>
      </Flex>
    </Container>
  );
};
