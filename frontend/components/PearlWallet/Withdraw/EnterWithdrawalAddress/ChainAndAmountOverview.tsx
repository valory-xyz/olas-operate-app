import { Flex, Typography } from 'antd';
import { entries, kebabCase } from 'lodash';
import Image from 'next/image';
import styled from 'styled-components';

import { BackButton, CardFlex } from '@/components/ui';
import { CHAIN_CONFIG } from '@/config/chains';
import { TokenSymbol, TokenSymbolConfigMap } from '@/config/tokens';
import { COLOR } from '@/constants';
import { usePearlWallet } from '@/context/PearlWalletProvider';
import { formatNumber } from '@/utils';

import { PearlWalletToExternalWallet } from '../../components/PearlWalletToExternalWallet';

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

  const amounts = entries(amountsToWithdraw).filter(
    ([, { amount }]) => amount > 0,
  );
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
                  alt={`${chainDetails.name} logo`}
                  width={20}
                  height={20}
                />
                {chainDetails.name}
              </OverviewContainer>
            </Flex>
          )}

          <Flex vertical gap={8}>
            <Text className="text-neutral-tertiary">You will receive</Text>
            <OverviewContainer vertical gap={12}>
              {amounts.map(([untypedSymbol, { amount }]) => {
                const symbol = untypedSymbol as TokenSymbol;

                return (
                  <Flex key={symbol} gap={8} align="center">
                    <Image
                      src={TokenSymbolConfigMap[symbol as TokenSymbol].image}
                      alt={`${symbol} logo`}
                      width={20}
                      height={20}
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
