import { Flex, Image, Typography } from 'antd';
import { entries, kebabCase } from 'lodash';
import styled from 'styled-components';

import { BackButton } from '@/components/ui/BackButton';
import { CardFlex } from '@/components/ui/CardFlex';
import { CHAIN_CONFIG } from '@/config/chains';
import { COLOR } from '@/constants/colors';
import { TokenSymbol, TokenSymbolConfigMap } from '@/constants/token';
import { formatNumber } from '@/utils/numberFormatters';

import { usePearlWallet } from '../../PearlWalletProvider';
import { PearlWalletToExternalWallet } from '../common';

const { Title, Text } = Typography;

const OverviewContainer = styled(Flex)`
  padding: 12px 16px;
  border-radius: 10px;
  background-color: ${COLOR.BACKGROUND};
`;

const WithdrawalAddressTitle = () => (
  <Flex vertical justify="space-between" gap={12}>
    <Title level={4} className="m-0">
      Enter Withdrawal Address
    </Title>
  </Flex>
);

export const ChainAndAmountOverview = ({ onBack }: { onBack: () => void }) => {
  const { walletChainId, amountsToWithdraw } = usePearlWallet();

  const amounts = entries(amountsToWithdraw).filter(([, amount]) => amount > 0);
  const chainDetails = walletChainId ? CHAIN_CONFIG[walletChainId] : null;

  return (
    <CardFlex $noBorder $padding="32px" className="w-full">
      <Flex gap={32} vertical>
        <Flex gap={12} vertical>
          <BackButton onPrev={onBack} />
          <WithdrawalAddressTitle />
        </Flex>
        <PearlWalletToExternalWallet />

        <Flex vertical gap={32}>
          {chainDetails?.name && (
            <Flex vertical gap={8}>
              <Text className="text-neutral-tertiary">Destination chain</Text>
              <OverviewContainer gap={8} align="center">
                <Image
                  src={`/chains/${kebabCase(chainDetails.name)}-chain.png`}
                  width={20}
                  preview={false}
                  alt={`${chainDetails.name} logo`}
                  className="flex"
                />
                {chainDetails.name}
              </OverviewContainer>
            </Flex>
          )}

          <Flex vertical gap={8}>
            <Text className="text-neutral-tertiary">You will receive</Text>
            <OverviewContainer vertical gap={12}>
              {amounts.map(([untypedSymbol, amount]) => {
                const symbol = untypedSymbol as TokenSymbol;

                return (
                  <Flex key={symbol} gap={8} align="center">
                    <Image
                      src={TokenSymbolConfigMap[symbol as TokenSymbol].image}
                      alt={symbol}
                      width={20}
                      className="flex"
                    />
                    <Text>{formatNumber(amount, 4)}</Text>
                    <Text>{symbol}</Text>
                  </Flex>
                );
              })}
            </OverviewContainer>
          </Flex>
        </Flex>
      </Flex>
    </CardFlex>
  );
};
