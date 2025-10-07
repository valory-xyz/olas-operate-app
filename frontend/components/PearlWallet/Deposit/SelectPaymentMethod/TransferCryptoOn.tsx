import { Button, Flex, Image, Typography } from 'antd';

import { BackButton, CardFlex, CardTitle } from '@/components/ui';
import { TokenSymbol, TokenSymbolConfigMap } from '@/constants';

import { usePearlWallet } from '../../PearlWalletProvider';
import { STEPS } from '../../types';
import { YouWillPayContainer } from './common';

const { Text, Paragraph } = Typography;

type TransferCryptoOnProps = {
  chainName: string;
  onBack: () => void;
};

export const TransferCryptoOn = ({
  chainName,
  onBack,
}: TransferCryptoOnProps) => {
  const { amountsToDeposit, updateStep } = usePearlWallet();

  return (
    <CardFlex $noBorder $padding="32px" style={{ width: 624 }}>
      <Flex vertical gap={32}>
        <Flex vertical gap={16}>
          <BackButton onPrev={onBack} />
          <CardTitle align="left" className="m-0">
            Transfer Crypto on {chainName}
          </CardTitle>
          <Paragraph type="secondary" className="m-0">
            Send the specified amounts from your external wallet to the Pearl
            Wallet address below. When you’re done, you can leave this screen —
            after the transfer confirms on Optimism, your Pearl Wallet balance
            updates automatically.
          </Paragraph>
        </Flex>

        <Flex vertical gap={8}>
          <Paragraph className="m-0" type="secondary">
            You will pay
          </Paragraph>
          <YouWillPayContainer vertical gap={12}>
            <Flex vertical gap={12}>
              {Object.entries(amountsToDeposit).map(([tokenSymbol, amount]) => (
                <Flex key={tokenSymbol} gap={8} align="center">
                  <Image
                    src={TokenSymbolConfigMap[tokenSymbol as TokenSymbol].image}
                    alt={tokenSymbol}
                    width={20}
                    className="flex"
                  />
                  <Flex gap={8} align="center">
                    <Text>
                      {amount.toFixed(4)} {tokenSymbol}
                    </Text>
                  </Flex>
                </Flex>
              ))}
            </Flex>
            <Text className="text-sm text-neutral-tertiary" type="secondary">
              + transaction fees on {chainName}.
            </Text>
          </YouWillPayContainer>
        </Flex>

        <Button
          onClick={() => updateStep(STEPS.PEARL_WALLET_SCREEN)}
          size="large"
        >
          Back to Pearl Wallet
        </Button>
      </Flex>
    </CardFlex>
  );
};
