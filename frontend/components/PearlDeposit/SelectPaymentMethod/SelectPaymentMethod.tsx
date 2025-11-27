import { Button, Flex, Typography } from 'antd';
import { entries, values } from 'lodash';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { styled } from 'styled-components';

import { YouPayContainer } from '@/components/PearlWallet';
import { RequirementsForOnRamp } from '@/components/SetupPage/FundYourAgent/components/TokensRequirements';
import { Alert, BackButton, CardFlex, CardTitle } from '@/components/ui';
import { getNativeTokenSymbol } from '@/config/tokens';
import { COLOR, EvmChainId, EvmChainIdMap, onRampChainMap } from '@/constants';
import { usePearlWallet } from '@/context/PearlWalletProvider';
import { Pages } from '@/enums';
import {
  useFeatureFlag,
  useGetBridgeRequirementsParamsFromDeposit,
  useOnRampContext,
  usePageState,
  useTotalFiatFromNativeToken,
  useTotalNativeTokenRequired,
} from '@/hooks';
import { asEvmChainDetails, asMiddlewareChain } from '@/utils';

import { BridgeCryptoOn } from './BridgeCryptoOn';
import { ShowAmountsToDeposit } from './ShowAmountsToDeposit';
import { TransferCryptoOn } from './TransferCryptoOn';

const { Title, Text, Paragraph } = Typography;

const SelectPaymentMethodCard = styled(CardFlex)`
  width: 320px;
  border-color: ${COLOR.WHITE};
  .ant-card-body {
    height: 100%;
  }
`;

const THRESHOLD_AMOUNT = 5;

const OnRampMethod = ({
  walletChainId,
  onSelect,
}: {
  walletChainId: EvmChainId;
  onSelect: () => void;
}) => {
  const { amountsToDeposit } = usePearlWallet();
  const { updateUsdAmountToPay, updateEthAmountToPay } = useOnRampContext();
  // Base as source chain for on-ramp
  const onRampChainId = onRampChainMap[asMiddlewareChain(walletChainId)];

  const nativeTokenSymbol = getNativeTokenSymbol(walletChainId);
  const isOnlyNativeToken = useMemo(() => {
    const depositEntries = entries(amountsToDeposit).filter(
      ([, { amount }]) => amount && Number(amount) > 0,
    );
    return (
      depositEntries.length === 1 && depositEntries[0][0] === nativeTokenSymbol
    );
  }, [amountsToDeposit, nativeTokenSymbol]);

  const directNativeTokenAmount = isOnlyNativeToken
    ? amountsToDeposit[nativeTokenSymbol]?.amount
    : undefined;

  // Get bridge requirements from amountsToDeposit for deposit flow
  // walletChainId as destination where tokens are deposited
  const getBridgeRequirementsParamsFromDeposit =
    useGetBridgeRequirementsParamsFromDeposit(onRampChainId, walletChainId);

  // Calculate total native token (ETH) needed to swap to all requested tokens
  const {
    isLoading: isNativeTokenLoading,
    hasError: hasNativeTokenError,
    totalNativeToken: calculatedNativeToken,
  } = useTotalNativeTokenRequired(
    onRampChainId,
    'preview',
    isOnlyNativeToken ? undefined : getBridgeRequirementsParamsFromDeposit,
  );

  const totalNativeToken = directNativeTokenAmount ?? calculatedNativeToken;

  // Convert native token to USD using Transak quote
  const { isLoading: isFiatLoading, data: fiatAmount } =
    useTotalFiatFromNativeToken(
      totalNativeToken ? totalNativeToken : undefined,
      walletChainId || undefined,
    );

  const isLoading = isOnlyNativeToken
    ? isFiatLoading
    : isNativeTokenLoading || isFiatLoading;

  // Store USD and ETH amounts in OnRampContext for OnRamp
  useEffect(() => {
    if (isLoading) {
      updateUsdAmountToPay(null);
      updateEthAmountToPay(null);
      return;
    }

    if (fiatAmount) {
      updateUsdAmountToPay(fiatAmount);
    }

    if (totalNativeToken) {
      updateEthAmountToPay(totalNativeToken);
    }
  }, [
    isLoading,
    fiatAmount,
    totalNativeToken,
    updateUsdAmountToPay,
    updateEthAmountToPay,
  ]);

  const hasAmountsToDeposit = useMemo(() => {
    return values(amountsToDeposit).some(({ amount }) => Number(amount) > 0);
  }, [amountsToDeposit]);

  const isFiatAmountTooLow = useMemo(() => {
    if (isLoading) return false;
    if (!fiatAmount && hasAmountsToDeposit) return true;
    if (fiatAmount && fiatAmount < THRESHOLD_AMOUNT) return true;
    return false;
  }, [fiatAmount, hasAmountsToDeposit, isLoading]);

  const isRequirementsLoading =
    isLoading || (hasAmountsToDeposit && !fiatAmount);

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
            isLoading={isRequirementsLoading}
          />
        </Flex>

        <Flex vertical className="mt-auto">
          {isFiatAmountTooLow ? (
            <Alert
              message={`The minimum value of crypto to buy with your credit card is ${THRESHOLD_AMOUNT}.`}
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
                !hasAmountsToDeposit || isLoading || hasNativeTokenError
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
  const { goto: gotoPage } = usePageState();
  const { walletChainId: chainId, amountsToDeposit } = usePearlWallet();
  const { setIsDepositFlow } = useOnRampContext();
  const [isBridgingEnabled, isOnRampingEnabled] = useFeatureFlag([
    'bridge-onboarding',
    'on-ramp-add-funds',
  ]);
  const [paymentMethod, setPaymentMethod] = useState<
    'BUY' | 'TRANSFER' | 'BRIDGE' | null
  >(null);

  const onPaymentMethodBack = useCallback(() => setPaymentMethod(null), []);

  if (!chainId) return null;

  const chainName = asEvmChainDetails(asMiddlewareChain(chainId)).displayName;

  // For when users pick different chains in Deposit.tsx
  const isBuyDisabled =
    chainId === EvmChainIdMap.Base || chainId === EvmChainIdMap.Mode;

  const shouldShowBuy = isOnRampingEnabled && !isBuyDisabled;

  if (paymentMethod === 'BUY') {
    setIsDepositFlow(true);
    gotoPage(Pages.OnRamp);
    return;
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
        {shouldShowBuy && (
          <OnRampMethod
            walletChainId={chainId}
            onSelect={() => setPaymentMethod('BUY')}
          />
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
