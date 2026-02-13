import { Button, Flex, Skeleton, Typography } from 'antd';
import Image from 'next/image';
import { useCallback, useMemo, useState } from 'react';
import { styled } from 'styled-components';

import { YouPayContainer } from '@/components/PearlWallet';
import { Alert, BackButton, CardFlex, CardTitle } from '@/components/ui';
import {
  TOKEN_CONFIG,
  TokenSymbol,
  TokenSymbolConfigMap,
} from '@/config/tokens';
import {
  AddressZero,
  COLOR,
  EvmChainId,
  MIN_ONRAMP_AMOUNT,
  ON_RAMP_CHAIN_MAP,
} from '@/constants';
import { usePearlWallet } from '@/context/PearlWalletProvider';
import {
  useFeatureFlag,
  useGetOnRampRequirementsParams,
  useTotalFiatFromNativeToken,
  useTotalNativeTokenRequired,
} from '@/hooks';
import { BridgeRefillRequirementsRequest } from '@/types/Bridge';
import { TokenAmountDetails } from '@/types/Wallet';
import { asEvmChainDetails, asMiddlewareChain, formatNumber } from '@/utils';

import { BridgeCryptoOn } from './BridgeCryptoOn';
import { OnRampCryptoOn } from './OnRampCryptoOn';
import { TransferCryptoOn } from './TransferCryptoOn';

const { Title, Text, Paragraph } = Typography;

const SelectPaymentMethodCard = styled(CardFlex)`
  max-width: 320px;
  border-color: ${COLOR.WHITE};
  .ant-card-body {
    height: 100%;
  }
`;

type ShowAmountsToDepositProps = { amountPrefix?: string };
const ShowAmountsToDeposit = ({
  amountPrefix = '',
}: ShowAmountsToDepositProps) => {
  const { amountsToDeposit } = usePearlWallet();
  return (
    <Flex vertical gap={12}>
      {Object.entries(amountsToDeposit)
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
                {amountPrefix}
                {formatNumber(amount, 4)} {tokenSymbol}
              </Text>
            </Flex>
          </Flex>
        ))}
    </Flex>
  );
};

type TransferMethodProps = { chainId: EvmChainId; onSelect: () => void };
const TransferMethod = ({ chainId, onSelect }: TransferMethodProps) => {
  const chainName = asEvmChainDetails(asMiddlewareChain(chainId)).displayName;

  return (
    <SelectPaymentMethodCard>
      <Flex vertical gap={32} flex="auto">
        <Flex vertical gap={16}>
          <CardTitle className="m-0">Transfer</CardTitle>
          <Paragraph type="secondary" className="m-0 text-center">
            Send funds directly with lowest fees — ideal for crypto-savvy users.
          </Paragraph>
        </Flex>

        <Flex vertical gap={8}>
          <Paragraph className="m-0" type="secondary">
            You will pay
          </Paragraph>
          <YouPayContainer vertical gap={12}>
            <ShowAmountsToDeposit />
            <Text className="text-sm text-neutral-tertiary" type="secondary">
              + transaction fees on {chainName}.
            </Text>
          </YouPayContainer>
        </Flex>

        <Button onClick={onSelect} size="large" className="mt-auto">
          Transfer Crypto on {chainName}
        </Button>
      </Flex>
    </SelectPaymentMethodCard>
  );
};

const BridgeMethod = ({ onSelect }: { onSelect: () => void }) => (
  <SelectPaymentMethodCard>
    <Flex vertical gap={32} flex="auto">
      <Flex vertical gap={16}>
        <CardTitle className="m-0">Bridge</CardTitle>
        <Paragraph type="secondary" className="m-0 text-center">
          Bridge from Ethereum Mainnet. Slightly more expensive.
        </Paragraph>
      </Flex>

      <Flex vertical gap={8}>
        <Paragraph className="m-0" type="secondary">
          Estimated to pay
        </Paragraph>
        <YouPayContainer vertical gap={12}>
          <ShowAmountsToDeposit amountPrefix="~" />
          <Text className="text-sm text-neutral-tertiary" type="secondary">
            Final amount may be higher due to Ethereum bridge fees and slippage.
          </Text>
        </YouPayContainer>
      </Flex>

      <Button onClick={onSelect} size="large" className="mt-auto">
        Bridge Crypto from Ethereum
      </Button>
    </Flex>
  </SelectPaymentMethodCard>
);

type OnRampMethodProps = {
  chainId: EvmChainId;
  onSelect: () => void;
};
const OnRampMethod = ({ chainId, onSelect }: OnRampMethodProps) => {
  const { amountsToDeposit } = usePearlWallet();
  const chainName = asMiddlewareChain(chainId);
  const onRampChainId = ON_RAMP_CHAIN_MAP[chainName].chain;

  // Check if user is trying to onramp native token
  const chainConfig = TOKEN_CONFIG[chainId];
  const hasNativeToken = Object.entries(amountsToDeposit).some(
    ([tokenSymbol, { amount }]) => {
      const token = chainConfig[tokenSymbol as TokenSymbol];
      return token && !token.address && Number(amount) > 0;
    },
  );

  // We can't on-ramp native tokens on the same chain between the same wallets
  // Because under the hood we use bridging after on-ramping, and for this case
  // The quote will fail. TODO: we should handle that differently
  const showSameChainError = onRampChainId === chainId && hasNativeToken;

  // Get on-ramp requirements params based on user-provided amounts
  const getOnRampRequirementsParams =
    useGetOnRampRequirementsParams(onRampChainId);

  const handleGetOnRampRequirementsParams = useCallback(
    (forceUpdate?: boolean): BridgeRefillRequirementsRequest => {
      const toDeposit = Object.entries(amountsToDeposit).filter(
        ([, { amount }]) => amount && amount > 0,
      ) as [TokenSymbol, TokenAmountDetails][];

      if (toDeposit.length === 0) {
        throw new Error('No amounts to deposit');
      }

      const onRampParams = toDeposit.map(([tokenSymbol, { amount }]) => {
        const token = TOKEN_CONFIG[chainId][tokenSymbol];
        if (!token) {
          throw new Error(
            `Token ${tokenSymbol} is not supported on chain ${chainId}`,
          );
        }

        return getOnRampRequirementsParams(
          token.address ?? AddressZero,
          amount,
        );
      });

      return {
        bridge_requests: onRampParams,
        force_update: forceUpdate ?? false,
      };
    },
    [amountsToDeposit, chainId, getOnRampRequirementsParams],
  );

  const {
    isLoading: isNativeTokenLoading,
    hasError: hasNativeTokenError,
    totalNativeToken,
  } = useTotalNativeTokenRequired(
    onRampChainId,
    chainId,
    handleGetOnRampRequirementsParams,
    'preview',
  );

  const { isLoading: isFiatLoading, data: totalFiatDetails } =
    useTotalFiatFromNativeToken({
      nativeTokenAmount: hasNativeTokenError ? undefined : totalNativeToken,
      selectedChainId: chainId,
    });

  const isLoading = isNativeTokenLoading || isFiatLoading;
  const isBuyDisabled = showSameChainError || hasNativeTokenError;

  const isFiatAmountTooLow = useMemo(() => {
    if (isLoading) return false;
    if (isNativeTokenLoading) return false;
    if (totalNativeToken === 0) return true;
    if (
      totalFiatDetails?.fiatAmount &&
      totalFiatDetails.fiatAmount < MIN_ONRAMP_AMOUNT
    ) {
      return true;
    }
    return false;
  }, [totalFiatDetails, isLoading, isNativeTokenLoading, totalNativeToken]);

  return (
    <SelectPaymentMethodCard>
      <Flex vertical gap={32} flex="auto">
        <Flex vertical gap={16}>
          <CardTitle className="m-0">Buy</CardTitle>
          <Paragraph type="secondary" className="m-0 text-center">
            Pay in fiat by using your credit or debit card — perfect for speed
            and ease!
          </Paragraph>
        </Flex>

        <Flex vertical gap={8}>
          <Paragraph className="m-0" type="secondary">
            Estimated to pay
          </Paragraph>
          <YouPayContainer vertical gap={12}>
            {isLoading ? (
              <Skeleton.Input
                size="small"
                active
                style={{ width: '120px', height: '22px' }}
              />
            ) : isBuyDisabled ? (
              showSameChainError ? (
                <Text type="danger" className="text-sm">
                  On-ramping of native tokens on the same chain is not yet
                  supported. Please use Transfer or Bridge method instead.
                </Text>
              ) : (
                <Text type="danger">Unable to calculate</Text>
              )
            ) : (
              <Text>~${totalFiatDetails?.fiatAmount?.toFixed(2) ?? '0.00'}</Text>
            )}
            <Text className="text-sm text-neutral-tertiary" type="secondary">
              Powered by Transak. Funds may take up to 10 minutes to be
              available.
            </Text>
          </YouPayContainer>
        </Flex>

        {isFiatAmountTooLow ? (
          <Alert
            message={`The minimum value of crypto to buy with your credit card is $${MIN_ONRAMP_AMOUNT}.`}
            type="info"
            showIcon
            className="text-sm mt-auto"
          />
        ) : (
          <Button
            onClick={onSelect}
            size="large"
            className="mt-auto"
            disabled={isLoading || isBuyDisabled}
          >
            Buy Crypto with USD
          </Button>
        )}
      </Flex>
    </SelectPaymentMethodCard>
  );
};

export const SelectPaymentMethod = ({ onBack }: { onBack: () => void }) => {
  const { walletChainId: chainId, amountsToDeposit } = usePearlWallet();
  const [isBridgingEnabled] = useFeatureFlag(['bridge-onboarding']);
  const [paymentMethod, setPaymentMethod] = useState<
    'TRANSFER' | 'BRIDGE' | 'ONRAMP' | null
  >(null);

  const onPaymentMethodBack = useCallback(() => setPaymentMethod(null), []);

  const chainName = useMemo(
    () =>
      chainId ? asEvmChainDetails(asMiddlewareChain(chainId)).displayName : '',
    [chainId],
  );

  // Calculate the onRamp chain based on the wallet chain
  const onRampChainId = useMemo(() => {
    if (!chainId) return null;
    const middlewareChain = asMiddlewareChain(chainId);
    return ON_RAMP_CHAIN_MAP[middlewareChain].chain;
  }, [chainId]);

  // If no chain is selected, we cannot proceed.
  if (!chainId) return null;

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

  if (paymentMethod === 'ONRAMP') {
    if (!onRampChainId) return null;
    return (
      <OnRampCryptoOn
        onRampChainId={onRampChainId}
        amountsToDeposit={amountsToDeposit}
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
          chainId={chainId}
          onSelect={() => setPaymentMethod('ONRAMP')}
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
