import {
  CheckSquareOutlined,
  ClockCircleOutlined,
  CopyOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import {
  Button,
  Divider,
  Flex,
  message,
  Spin,
  Tooltip,
  Typography,
} from 'antd';
import { formatEther } from 'ethers/lib/utils';
import { kebabCase } from 'lodash';
import Image from 'next/image';
import { useCallback, useState } from 'react';
import styled from 'styled-components';

import { COLOR } from '@/constants/colors';
import { TokenSymbol } from '@/enums/Token';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { copyToClipboard } from '@/utils/copyToClipboard';

import { InfoTooltip } from '../InfoTooltip';

const { Text } = Typography;

const RootCard = styled(Flex)`
  align-items: start;
  border-radius: 12px;
  border: 1px solid ${COLOR.BORDER_GRAY};
`;

// TODO: move to some shared place? e.g. constants?
const LIGHT_ICON_STYLE = { color: COLOR.TEXT_LIGHT };
const WARNING_ICON_STYLE = { color: COLOR.WARNING };
const SUCCESS_ICON_STYLE = { color: COLOR.SUCCESS };

type TokenInfoProps = {
  symbol: TokenSymbol;
  totalRequiredInWei: bigint;
  currentBalanceInWei: bigint;
  isNative?: boolean;
};

const TokenInfo = ({
  symbol,
  totalRequiredInWei,
  currentBalanceInWei,
  isNative,
}: TokenInfoProps) => {
  const depositRequiredInWei = totalRequiredInWei - currentBalanceInWei;
  const areFundsReceived = depositRequiredInWei <= 0;

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
              {formatEther(depositRequiredInWei)}&nbsp;
              {symbol}
            </Text>
          </Text>
        </>
      )}

      <InfoTooltip overlayInnerStyle={{ width: 320 }} placement="top">
        <Flex vertical gap={12} className="p-8">
          <Flex justify="space-between">
            <Text type="secondary" className="text-sm">
              Total amount required
            </Text>
            <Text
              className="text-sm"
              strong
            >{`${formatEther(totalRequiredInWei)} ${symbol}`}</Text>
          </Flex>
          <Flex justify="space-between">
            <Text type="secondary" className="text-sm">
              Balance at deposit address
            </Text>
            <Text
              className="text-sm"
              strong
            >{`${formatEther(currentBalanceInWei)} ${symbol}`}</Text>
          </Flex>
          <Divider className="m-0" />
          <Flex justify="space-between">
            <Text className="text-sm" strong>
              Deposit required
            </Text>
            <Text
              className="text-sm"
              strong
            >{`${formatEther(depositRequiredInWei)} ${symbol}`}</Text>
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

// TODO: make a shared component similar to AccountCreationAddress
// in frontend/components/SetupPage/Create/SetupEoaFunding.tsx
const DepositAddress = () => {
  const { masterEoa } = useMasterWalletContext();
  const address = masterEoa?.address;

  const handleCopyAddress = useCallback(() => {
    if (address) {
      copyToClipboard(address).then(() => message.success('Address copied!'));
    }
  }, [address]);

  return (
    <Flex gap={8} vertical className="p-16">
      <Flex justify="space-between" align="center">
        <Text className="text-sm" type="secondary">
          Deposit address
        </Text>
        <Flex gap={10}>
          <Tooltip title="Copy to clipboard" placement="left">
            <Button
              onClick={handleCopyAddress}
              size="small"
              icon={<CopyOutlined style={LIGHT_ICON_STYLE} />}
            />
          </Tooltip>
        </Flex>
      </Flex>

      <span className="can-select-text break-word">{`${address}`}</span>
    </Flex>
  );
};

type DepositForBridgingProps = {
  chainName: string;
};

export const DepositForBridging = ({ chainName }: DepositForBridgingProps) => {
  // TODO: use API for getting quote and pass it as a prop
  const [isRequestingQuote] = useState(false);
  const [tokens] = useState<TokenInfoProps[]>([
    {
      symbol: TokenSymbol.OLAS,
      totalRequiredInWei: BigInt('40000000000000000000'), // 40 Ether
      currentBalanceInWei: BigInt(0),
    },
    {
      symbol: TokenSymbol.ETH,
      isNative: true, // TODO: define by chainName using getNativeTokenSymbol
      totalRequiredInWei: BigInt('55000000000000000'), // 0.055 Ether
      currentBalanceInWei: BigInt('55000000000000000'), // 0.055 Ether
    },
  ]);

  return (
    <RootCard vertical>
      <Flex gap={8} align="center" className="p-16">
        <Image
          src={`/chains/${kebabCase(chainName)}-chain.png`}
          width={20}
          height={20}
          alt="chain logo"
        />
        <Text>{chainName}</Text>
      </Flex>

      <Divider className="m-0" />

      {isRequestingQuote ? (
        <Flex gap={8} className="p-16">
          <Spin indicator={<LoadingOutlined spin style={LIGHT_ICON_STYLE} />} />
          <Text>Requesting quote...</Text>
        </Flex>
      ) : (
        <>
          <Flex gap={8} align="start" vertical className="p-16">
            {tokens.map((token) => (
              <TokenInfo
                key={token.symbol}
                isNative={token.isNative}
                symbol={token.symbol}
                totalRequiredInWei={token.totalRequiredInWei}
                currentBalanceInWei={token.currentBalanceInWei}
              />
            ))}
          </Flex>

          <Divider className="m-0" />

          <DepositAddress />
        </>
      )}
    </RootCard>
  );
};
