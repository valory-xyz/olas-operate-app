import { Button, Flex, Typography } from 'antd';
import { floor, isNil } from 'lodash';
import Image from 'next/image';
import { ReactNode, useCallback } from 'react';
import { TbInfoCircle, TbWallet } from 'react-icons/tb';
import styled from 'styled-components';

import { TokenSymbol, TokenSymbolConfigMap } from '@/config/tokens';
import { COLOR } from '@/constants';
import { formatNumber } from '@/utils';

import { NumberInput } from './NumberInput';
import { Tooltip } from './tooltips';

const { Text } = Typography;

const DECIMAL_PLACES = 6;

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
      height={20}
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
  onChange: (value: number | null, options: { withdrawAll?: boolean }) => void;
  tokenSymbol: TokenSymbol;
  /** Whether to show quick select buttons (10%, 25%, 50%, 100%) */
  showQuickSelects?: boolean;
  /** Whether the input has an error */
  hasError?: boolean;
  /** Tooltip info */
  tooltipInfo?: ReactNode;
};

export const TokenAmountInput = ({
  value,
  maxAmount,
  totalAmount,
  onChange,
  tokenSymbol,
  showQuickSelects = true,
  hasError = false,
  tooltipInfo,
}: TokenAmountInputProps) => {
  const handleChange = useCallback(
    (newValue: number | null) => {
      if (isNil(newValue)) {
        onChange(null, { withdrawAll: false });
        return;
      }

      // Prevent more than allowed decimal places, in this case 6 decimal places
      const decimalPart = String(newValue).split('.')[1];
      if (decimalPart && decimalPart.length > DECIMAL_PLACES) {
        return;
      }

      // Limit decimal places
      const limited = floor(newValue, DECIMAL_PLACES);
      onChange(limited, { withdrawAll: false });
    },
    [onChange],
  );

  return (
    <Container $hasError={hasError}>
      <Flex
        className="input-wrapper"
        gap={12}
        align="center"
        justify="space-between"
      >
        <NumberInput
          onChange={handleChange}
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
          <TbWallet size={20} color={COLOR.TEXT_NEUTRAL_TERTIARY} />
          <Text className="text-sm leading-normal text-neutral-tertiary">
            {formatNumber(totalAmount, DECIMAL_PLACES, 'floor')}
          </Text>
          {tooltipInfo && (
            <Tooltip title={tooltipInfo} styles={{ body: { width: 340 } }}>
              <TbInfoCircle size={20} color={COLOR.TEXT_NEUTRAL_TERTIARY} />
            </Tooltip>
          )}
        </Flex>

        {showQuickSelects && (
          <Flex gap={8} align="center">
            {[10, 25, 50, 100].map((percentage) => (
              <Button
                key={percentage}
                onClick={() => {
                  // Calculate the amount based on the percentage
                  // and ceil to the allowed decimal places.
                  const ceiledAmount = floor(
                    Number((totalAmount * percentage) / 100),
                    DECIMAL_PLACES,
                  );
                  onChange(ceiledAmount, { withdrawAll: percentage === 100 });
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
};
