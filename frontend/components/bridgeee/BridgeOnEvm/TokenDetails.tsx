import { CheckSquareOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { Divider, Flex, Typography } from 'antd';

import { TokenSymbol } from '@/enums/Token';
import { Address } from '@/types/Address';
import { formatUnitsToNumber } from '@/utils/numberFormatters';

import { InfoTooltip } from '../../InfoTooltip';
import { SUCCESS_ICON_STYLE, WARNING_ICON_STYLE } from '../../ui/iconStyles';

const { Text } = Typography;

export type DepositTokenDetails = {
  address?: Address;
  symbol: TokenSymbol;
  totalRequiredInWei: bigint;
  currentBalanceInWei: bigint;
  areFundsReceived: boolean;
  decimals: number;
  isNative?: boolean;
  precision?: number;
};

export const TokenDetails = ({
  symbol,
  totalRequiredInWei,
  currentBalanceInWei,
  areFundsReceived,
  decimals,
  isNative,
  precision = 2,
}: DepositTokenDetails) => {
  const depositRequiredInWei = totalRequiredInWei - currentBalanceInWei;

  return (
    <Flex gap={8} align="center">
      {areFundsReceived ? (
        <>
          <CheckSquareOutlined style={SUCCESS_ICON_STYLE} />
          <Text strong>{symbol}</Text> funds received!
        </>
      ) : (
        <>
          <ClockCircleOutlined style={WARNING_ICON_STYLE} />
          <Text className="loading-ellipses">
            Waiting for{' '}
            <Text strong>
              {formatUnitsToNumber(depositRequiredInWei, decimals, precision)}
              &nbsp;
              {symbol}
            </Text>
          </Text>
        </>
      )}

      <InfoTooltip overlayInnerStyle={{ width: 340 }} placement="topRight">
        <Flex vertical gap={8} className="p-8">
          <Flex justify="space-between">
            <Text type="secondary" className="text-sm">
              Total amount required
            </Text>
            <Text
              className="text-sm"
              strong
            >{`${formatUnitsToNumber(totalRequiredInWei, decimals, precision)} ${symbol}`}</Text>
          </Flex>
          <Flex justify="space-between">
            <Text type="secondary" className="text-sm">
              Balance at deposit address
            </Text>
            <Text
              className="text-sm"
              strong
            >{`${formatUnitsToNumber(currentBalanceInWei, decimals, precision)} ${symbol}`}</Text>
          </Flex>
          <Divider className="m-0" />
          <Flex justify="space-between">
            <Text className="text-sm" strong>
              Deposit required
            </Text>
            <Text
              className="text-sm"
              strong
            >{`${formatUnitsToNumber(depositRequiredInWei, decimals, precision)} ${symbol}`}</Text>
          </Flex>
          {isNative && (
            <Text type="secondary" className="text-sm">
              The total amount may fluctuate due to periodic quote updates.
            </Text>
          )}
        </Flex>
      </InfoTooltip>
    </Flex>
  );
};
