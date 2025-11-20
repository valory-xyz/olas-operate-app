import { Button, Flex, Typography } from 'antd';
import { entries, values } from 'lodash';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { styled } from 'styled-components';

import { YouPayContainer } from '@/components/PearlWallet';
import { RequirementsForOnRamp } from '@/components/SetupPage/FundYourAgent/components/TokensRequirements';
import { Alert, BackButton, CardFlex, CardTitle } from '@/components/ui';
import {
  COLOR,
  EvmChainId,
  TokenSymbol,
  TokenSymbolConfigMap,
} from '@/constants';
import { onRampChainMap } from '@/constants/chains';
import { usePearlWallet } from '@/context/PearlWalletProvider';
import { Pages, SetupScreen } from '@/enums';
import {
  useFeatureFlag,
  useOnRampContext,
  usePageState,
  useSetup,
  useTotalFiatFromNativeToken,
} from '@/hooks';
import { useGetBridgeRequirementsParamsFromDeposit } from '@/hooks/useGetBridgeRequirementsParamsFromDeposit';
import { useTotalNativeTokenRequired } from '@/hooks/useTotalNativeTokenRequired';
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
  onFiatAmountChange,
}: {
  isOnRamping?: boolean;
  onRampChainId?: EvmChainId;
  onLoadingChange?: (isLoading: boolean) => void;
  onFiatAmountChange?: (amount: number | null) => void;
}) => {
  const { amountsToDeposit, walletChainId } = usePearlWallet();
  const { updateUsdAmountToPay, updateEthAmountToPay } = useOnRampContext();
  const chainId = onRampChainId || walletChainId;

  // Calculate total native token from amountsToDeposit
  // Note: Transak only buys native token (ETH).
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

  useEffect(() => {
    if (!isOnRamping) return;

    if (isFiatLoading) {
      updateUsdAmountToPay(null);
      updateEthAmountToPay(null);
    } else {
      if (fiatAmount) {
        updateUsdAmountToPay(fiatAmount);
      }
      if (totalNativeToken > 0) {
        updateEthAmountToPay(totalNativeToken);
      }
    }
  }, [
    isOnRamping,
    isFiatLoading,
    fiatAmount,
    totalNativeToken,
    updateUsdAmountToPay,
    updateEthAmountToPay,
  ]);

  // Notify parent of loading state and fiat amount
  useEffect(() => {
    if (onLoadingChange) {
      onLoadingChange(isFiatLoading);
    }
    if (onFiatAmountChange) {
      onFiatAmountChange(fiatAmount || null);
    }
  }, [isFiatLoading, fiatAmount, onLoadingChange, onFiatAmountChange]);

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

const OnRampMethod = ({ onSelect }: { onSelect: () => void }) => {
  const { amountsToDeposit, walletChainId } = usePearlWallet();
  const { updateUsdAmountToPay, updateEthAmountToPay, networkId } =
    useOnRampContext();
  // Use networkId from context (on-ramp chain, e.g., Base)
  // This is the chain where Transak will purchase ETH
  // Fallback to deriving from walletChainId if networkId is not available
  const actualOnRampChainId = useMemo(() => {
    if (networkId) return networkId;
    if (!walletChainId) return null;
    const middlewareChain = asMiddlewareChain(walletChainId);
    return onRampChainMap[middlewareChain];
  }, [networkId, walletChainId]);

  // Get bridge requirements from amountsToDeposit for deposit flow
  const getBridgeRequirementsParamsFromDeposit =
    useGetBridgeRequirementsParamsFromDeposit();

  // Create a unique query key suffix based on amounts to ensure React Query sees changes
  const amountsHash = useMemo(() => {
    const amounts = entries(amountsToDeposit)
      .filter(([, { amount }]) => Number(amount) > 0)
      .map(([symbol, { amount }]) => `${symbol}:${amount}`)
      .sort()
      .join('|');
    return amounts ? `deposit-${amounts}` : 'deposit-empty';
  }, [amountsToDeposit]);

  // Calculate total native token (ETH) needed to swap to all requested tokens
  const {
    isLoading: isNativeTokenLoading,
    hasError: hasNativeTokenError,
    totalNativeToken,
  } = useTotalNativeTokenRequired(
    actualOnRampChainId ?? (0 as EvmChainId), // Fallback to 0 if null (shouldn't happen)
    amountsHash,
    getBridgeRequirementsParamsFromDeposit,
  );

  const { isLoading: isFiatLoading, data: fiatAmount } =
    useTotalFiatFromNativeToken(
      totalNativeToken ? totalNativeToken : undefined,
    );

  const isLoading = isNativeTokenLoading || isFiatLoading;

  useEffect(() => {
    if (isLoading) {
      updateUsdAmountToPay(null);
      updateEthAmountToPay(null);
    } else {
      if (fiatAmount) {
        updateUsdAmountToPay(fiatAmount);
      }
      if (totalNativeToken) {
        updateEthAmountToPay(totalNativeToken);
      }
    }
  }, [
    isLoading,
    fiatAmount,
    totalNativeToken,
    updateUsdAmountToPay,
    updateEthAmountToPay,
  ]);

  // Check if there are any amounts to deposit
  const hasAmountsToDeposit = useMemo(() => {
    return values(amountsToDeposit).some(({ amount }) => Number(amount) > 0);
  }, [amountsToDeposit]);

  const isFiatAmountTooLow = useMemo(() => {
    if (isLoading) return false;
    if (!fiatAmount && hasAmountsToDeposit) return true;
    if (fiatAmount && fiatAmount < 5) return true;
    return false;
  }, [fiatAmount, hasAmountsToDeposit, isLoading]);

  return (
    <SelectPaymentMethodCard>
      <Flex vertical style={{ height: '100%' }}>
        <Flex vertical gap={16}>
          <CardTitle className="m-0">Buy</CardTitle>
          <Paragraph type="secondary" className="m-0 text-center">
            Pay in fiat by using your credit or debit card — perfect for speed
            and ease!
          </Paragraph>

          <RequirementsForOnRamp
            fiatAmount={fiatAmount ? fiatAmount.toFixed(2) : '0'}
          />
        </Flex>

        <Flex vertical className="mt-auto">
          {isFiatAmountTooLow ? (
            <Alert
              message="The minimum value of crypto to buy with your credit card is $5."
              type="info"
              showIcon
              className="text-sm"
            />
          ) : (
            <Button
              type="primary"
              size="large"
              onClick={onSelect}
              disabled={
                !hasAmountsToDeposit ||
                isLoading ||
                hasNativeTokenError ||
                !!isFiatAmountTooLow
              }
            >
              Buy Crypto with USD
            </Button>
          )}
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
      <Flex vertical gap={32} style={{ height: '100%' }}>
        <Flex vertical gap={16}>
          <CardTitle className="m-0">Transfer</CardTitle>
          <Paragraph type="secondary" className="m-0 text-center">
            Send funds directly with lowest fees — ideal for crypto-savvy users.
          </Paragraph>

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
        </Flex>

        <Flex vertical className="mt-auto">
          <Button onClick={onSelect} size="large">
            Transfer Crypto on {chainName}
          </Button>
        </Flex>
      </Flex>
    </SelectPaymentMethodCard>
  );
};

const BridgeMethod = ({ onSelect }: { onSelect: () => void }) => (
  <SelectPaymentMethodCard>
    <Flex vertical gap={32} style={{ height: '100%' }}>
      <Flex vertical gap={16}>
        <CardTitle className="m-0">Bridge</CardTitle>
        <Paragraph
          type="secondary"
          className="m-0 text-center"
          style={{ height: '72px' }}
        >
          Bridge from Ethereum Mainnet. Slightly more expensive.
        </Paragraph>

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
      </Flex>

      <Flex vertical className="mt-auto">
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
  const { setIsFromDepositFlow } = useOnRampContext();
  const [isBridgingEnabled, isOnRampingEnabled] = useFeatureFlag([
    'bridge-onboarding',
    'on-ramp-add-funds',
  ]);
  const [paymentMethod, setPaymentMethod] = useState<
    'BUY' | 'TRANSFER' | 'BRIDGE' | null
  >(null);

  const onPaymentMethodBack = useCallback(() => setPaymentMethod(null), []);

  // If no chain is selected, we cannot proceed.
  if (!chainId) return null;

  const chainName = asEvmChainDetails(asMiddlewareChain(chainId)).displayName;

  if (paymentMethod === 'BUY') {
    setIsFromDepositFlow(true);
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
        {isOnRampingEnabled && (
          <OnRampMethod onSelect={() => setPaymentMethod('BUY')} />
        )}
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
