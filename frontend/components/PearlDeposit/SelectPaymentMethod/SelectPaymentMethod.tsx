import { Button, Flex, Typography } from 'antd';
import { entries, values } from 'lodash';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { styled } from 'styled-components';

import { YouPayContainer } from '@/components/PearlWallet';
import { BackButton, CardFlex, CardTitle } from '@/components/ui';
import {
  COLOR,
  EvmChainId,
  TokenSymbol,
  TokenSymbolConfigMap,
} from '@/constants';
import { usePearlWallet } from '@/context/PearlWalletProvider';
import { Pages, SetupScreen } from '@/enums';
import {
  useFeatureFlag,
  useOnRampContext,
  usePageState,
  useSetup,
  useTotalFiatFromNativeToken,
} from '@/hooks';
import { asEvmChainDetails, asMiddlewareChain, formatNumber } from '@/utils';

import { BridgeCryptoOn } from './BridgeCryptoOn';
import { TransferCryptoOn } from './TransferCryptoOn';

const { Title, Text, Paragraph } = Typography;

const SelectPaymentMethodCard = styled(CardFlex)`
  width: 323px;
  border-color: ${COLOR.WHITE};
  .ant-card-body {
    height: 100%;
  }
`;

const ShowAmountsToDeposit = ({
  isOnRamping = false,
  onRampChainId,
  onLoadingChange,
}: {
  isOnRamping?: boolean;
  onRampChainId?: EvmChainId;
  onLoadingChange?: (isLoading: boolean) => void;
}) => {
  const { amountsToDeposit, walletChainId } = usePearlWallet();
  const { updateUsdAmountToPay } = useOnRampContext();
  const chainId = onRampChainId || walletChainId;

  // Calculate total native token from amountsToDeposit
  const totalNativeToken = useMemo(() => {
    if (!chainId || !amountsToDeposit) return 0;

    const chainDetails = asEvmChainDetails(asMiddlewareChain(chainId));
    const nativeTokenSymbol = chainDetails.symbol as TokenSymbol;

    const nativeTokenAmount = amountsToDeposit[nativeTokenSymbol]?.amount || 0;
    return nativeTokenAmount;
  }, [chainId, amountsToDeposit]);

  // Convert to USD
  const { isLoading: isFiatLoading, data: fiatAmount } =
    useTotalFiatFromNativeToken(
      isOnRamping && totalNativeToken > 0 ? totalNativeToken : undefined,
    );

  // Store USD amount in OnRampContext for Transak (calculated silently, not displayed)
  // Transak will handle the actual conversion and display
  useEffect(() => {
    if (!isOnRamping) return;

    if (isFiatLoading) {
      updateUsdAmountToPay(null);
    } else if (fiatAmount) {
      updateUsdAmountToPay(fiatAmount);
    }
  }, [isOnRamping, isFiatLoading, fiatAmount, updateUsdAmountToPay]);

  // Notify parent of loading state
  useEffect(() => {
    if (onLoadingChange) {
      onLoadingChange(isFiatLoading);
    }
  }, [isFiatLoading, onLoadingChange]);

  // Always show native token amounts - Transak will handle USD conversion
  return (
    <Flex vertical gap={12}>
      {entries(amountsToDeposit)
        .filter(([, { amount }]) => Number(amount) > 0)
        .map(([tokenSymbol, { amount }]) => (
          <Flex key={tokenSymbol} gap={8} align="center">
            <Image
              src={TokenSymbolConfigMap[tokenSymbol as TokenSymbol].image}
              alt={tokenSymbol}
              width={20}
              height={20}
            />
            <Flex gap={8} align="center">
              <Text>
                {formatNumber(amount, 4)} {tokenSymbol}
              </Text>
            </Flex>
          </Flex>
        ))}
    </Flex>
  );
};

const OnRampMethod = ({
  onRampChainId,
  onSelect,
}: {
  onRampChainId: EvmChainId;
  onSelect: () => void;
}) => {
  const { amountsToDeposit } = usePearlWallet();
  const [isFiatLoading, setIsFiatLoading] = useState(false);

  // Check if there are any amounts to deposit
  const hasAmountsToDeposit = useMemo(() => {
    return values(amountsToDeposit).some(({ amount }) => Number(amount) > 0);
  }, [amountsToDeposit]);

  return (
    <SelectPaymentMethodCard>
      <Flex vertical gap={32}>
        <Flex vertical gap={16}>
          <CardTitle className="m-0">Buy</CardTitle>
          <Paragraph type="secondary" className="m-0 text-center">
            Pay in fiat by using your credit or debit card — perfect for speed
            and ease!
          </Paragraph>
        </Flex>

        <Flex vertical>
          <ShowAmountsToDeposit
            isOnRamping={true}
            onRampChainId={onRampChainId}
            onLoadingChange={setIsFiatLoading}
          />
          <Button
            type="primary"
            size="large"
            onClick={onSelect}
            disabled={!hasAmountsToDeposit || isFiatLoading}
          >
            Buy Crypto with USD
          </Button>
        </Flex>
      </Flex>
    </SelectPaymentMethodCard>
  );
};

type TransferMethodProps = { chainId: EvmChainId; onSelect: () => void };
const TransferMethod = ({ chainId, onSelect }: TransferMethodProps) => {
  const chainName = asEvmChainDetails(asMiddlewareChain(chainId)).displayName;

  return (
    <SelectPaymentMethodCard>
      <Flex vertical gap={32}>
        <Flex vertical gap={16}>
          <CardTitle className="m-0">Transfer</CardTitle>
          <Paragraph type="secondary" className="m-0 text-center">
            Send funds directly with lowest fees — ideal for crypto-savvy users.
          </Paragraph>
        </Flex>

        <Flex vertical gap={12}>
          <Paragraph className="text-neutral-tertiary m-0" type="secondary">
            You will pay
          </Paragraph>
          <YouPayContainer vertical gap={12}>
            <ShowAmountsToDeposit />
            <Text className="text-sm text-neutral-tertiary" type="secondary">
              + transaction fees on {chainName}.
            </Text>
          </YouPayContainer>
        </Flex>

        <Button onClick={onSelect} size="large">
          Transfer Crypto on {chainName}
        </Button>
      </Flex>
    </SelectPaymentMethodCard>
  );
};

const BridgeMethod = ({ onSelect }: { onSelect: () => void }) => (
  <SelectPaymentMethodCard>
    <Flex vertical style={{ height: '100%' }}>
      <Flex vertical gap={16}>
        <CardTitle className="m-0">Bridge</CardTitle>
        <Paragraph type="secondary" className="m-0 text-center">
          Bridge from Ethereum Mainnet. Slightly more expensive.
        </Paragraph>
      </Flex>

      <Flex vertical gap={32} className="mt-auto">
        <Flex vertical gap={12}>
          <Paragraph className="text-neutral-tertiary m-0" type="secondary">
            You will pay
          </Paragraph>
          <YouPayContainer vertical gap={12}>
            <ShowAmountsToDeposit />
            <Text className="text-sm text-neutral-tertiary" type="secondary">
              + bridging fees on Ethereum.
            </Text>
          </YouPayContainer>
        </Flex>

        <Button onClick={onSelect} size="large">
          Bridge Crypto from Ethereum
        </Button>
      </Flex>
    </Flex>
  </SelectPaymentMethodCard>
);

export const SelectPaymentMethod = ({ onBack }: { onBack: () => void }) => {
  const { goto: gotoSetup } = useSetup();
  const { goto: gotoPage } = usePageState();
  const { walletChainId: chainId, amountsToDeposit } = usePearlWallet();
  const [isBridgingEnabled] = useFeatureFlag(['bridge-onboarding']);
  const [paymentMethod, setPaymentMethod] = useState<
    'BUY' | 'TRANSFER' | 'BRIDGE' | null
  >(null);

  const onPaymentMethodBack = useCallback(() => setPaymentMethod(null), []);

  // If no chain is selected, we cannot proceed.
  if (!chainId) return null;

  const chainName = asEvmChainDetails(asMiddlewareChain(chainId)).displayName;

  if (paymentMethod === 'BUY') {
    gotoPage(Pages.Setup);
    gotoSetup(SetupScreen.SetupOnRamp);
  }

  if (paymentMethod === 'TRANSFER') {
    return <TransferCryptoOn chainName={chainName} onBack={onBack} />;
  }

  if (paymentMethod === 'BRIDGE') {
    return (
      <BridgeCryptoOn
        amountsToDeposit={amountsToDeposit}
        bridgeToChain={asMiddlewareChain(chainId)}
        onBack={onPaymentMethodBack}
      />
    );
  }

  return (
    <Flex vertical align="center" className="w-full px-16">
      <BackButton onPrev={onBack} />
      <Title level={4} className="mt-12 mb-32">
        Select Payment Method
      </Title>

      <Flex gap={24}>
        <OnRampMethod
          onRampChainId={chainId}
          onSelect={() => setPaymentMethod('BUY')}
        />
        <TransferMethod
          chainId={chainId}
          onSelect={() => setPaymentMethod('TRANSFER')}
        />
        {isBridgingEnabled && (
          <BridgeMethod onSelect={() => setPaymentMethod('BRIDGE')} />
        )}
      </Flex>
    </Flex>
  );
};
