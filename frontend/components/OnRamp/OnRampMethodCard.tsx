import { Alert, Button, Flex, Typography } from 'antd';
import { entries, values } from 'lodash';
import { useEffect, useMemo } from 'react';
import styled from 'styled-components';

import { CardFlex, CardTitle } from '@/components/ui';
import { getNativeTokenSymbol } from '@/config/tokens';
import { COLOR, EvmChainId, onRampChainMap } from '@/constants';
import { usePearlWallet } from '@/context/PearlWalletProvider';
import {
  useGetBridgeRequirementsParamsFromDeposit,
  useOnRampContext,
  useTotalFiatFromNativeToken,
  useTotalNativeTokenRequired,
} from '@/hooks';
import { asMiddlewareChain } from '@/utils';

import { TokenRequirements } from '../SetupPage/FundYourAgent/components/TokensRequirements';

const { Paragraph } = Typography;

const OnRampMethodCardStyled = styled(CardFlex)<{ $width?: number }>`
  width: ${({ $width }) => $width ?? 320}px;
  border-color: ${COLOR.WHITE};
  .ant-card-body {
    height: 100%;
  }
`;

const THRESHOLD_AMOUNT = 5;

type OnRampMethodCardProps = {
  onRampChainId: EvmChainId;
  queryKey: 'preview' | 'onboarding' | 'depositing';
  onSelect: () => void;
  width?: number;
  walletChainId?: EvmChainId;
  showThresholdValidation?: boolean;
};

export const OnRampMethodCard = ({
  onRampChainId,
  queryKey,
  onSelect,
  width,
  walletChainId,
  showThresholdValidation = false,
}: OnRampMethodCardProps) => {
  const { amountsToDeposit } = usePearlWallet();
  const { updateUsdAmountToPay, updateEthAmountToPay } = useOnRampContext();

  // For deposit flow: determine on-ramp chain from wallet chain
  // For onboarding flow: use provided onRampChainId
  const effectiveOnRampChainId = useMemo(() => {
    if (walletChainId) {
      const destinationChainName = asMiddlewareChain(walletChainId);
      return onRampChainMap[destinationChainName];
    }
    return onRampChainId;
  }, [walletChainId, onRampChainId]);

  const destinationChainId = walletChainId;

  // Deposit flow: check if only native token is being deposited
  const nativeTokenSymbol = walletChainId
    ? getNativeTokenSymbol(walletChainId)
    : undefined;
  const isOnlyNativeToken = useMemo(() => {
    if (!walletChainId || !nativeTokenSymbol) return false;
    const depositEntries = entries(amountsToDeposit).filter(
      ([, { amount }]) => amount && Number(amount) > 0,
    );
    return (
      depositEntries.length === 1 && depositEntries[0][0] === nativeTokenSymbol
    );
  }, [amountsToDeposit, nativeTokenSymbol, walletChainId]);

  const directNativeTokenAmount = isOnlyNativeToken
    ? amountsToDeposit?.[nativeTokenSymbol!]?.amount
    : undefined;

  // Get bridge requirements from amountsToDeposit for deposit flow
  const getBridgeRequirementsParamsFromDeposit =
    useGetBridgeRequirementsParamsFromDeposit(
      effectiveOnRampChainId,
      destinationChainId,
    );

  // Calculate total native token (ETH) needed to swap to all requested tokens
  const {
    isLoading: isNativeTokenLoading,
    hasError: hasNativeTokenError,
    totalNativeToken: calculatedNativeToken,
  } = useTotalNativeTokenRequired(
    effectiveOnRampChainId,
    queryKey,
    isOnlyNativeToken ? undefined : getBridgeRequirementsParamsFromDeposit,
  );

  const totalNativeToken = directNativeTokenAmount ?? calculatedNativeToken;

  // Convert native token to USD using Transak quote
  const { isLoading: isFiatLoading, data: fiatAmount } =
    useTotalFiatFromNativeToken(
      totalNativeToken ? totalNativeToken : undefined,
      destinationChainId || undefined,
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

  // Deposit flow: check if user has amounts to deposit
  const hasAmountsToDeposit = useMemo(() => {
    if (!showThresholdValidation) return true;
    return values(amountsToDeposit).some(({ amount }) => Number(amount) > 0);
  }, [amountsToDeposit, showThresholdValidation]);

  // Deposit flow: check if fiat amount is too low
  const isFiatAmountTooLow = useMemo(() => {
    if (!showThresholdValidation) return false;
    if (isLoading) return false;
    if (!fiatAmount && hasAmountsToDeposit) return true;
    if (fiatAmount && fiatAmount < THRESHOLD_AMOUNT) return true;
    return false;
  }, [fiatAmount, hasAmountsToDeposit, isLoading, showThresholdValidation]);

  const isRequirementsLoading =
    isLoading ||
    (showThresholdValidation && hasAmountsToDeposit && !fiatAmount);

  const isDepositFlow = showThresholdValidation || !!walletChainId;

  const cardTitleClassName = isDepositFlow ? 'm-0' : undefined;
  const outerGap = isDepositFlow ? 32 : undefined;
  const innerGap = isDepositFlow ? 16 : undefined;
  const tokenRequirementsGap = isDepositFlow ? 12 : undefined;

  return (
    <OnRampMethodCardStyled $width={width}>
      <Flex vertical gap={outerGap} style={{ height: '100%' }}>
        <Flex vertical gap={innerGap} style={{ flex: 1 }}>
          <CardTitle className={cardTitleClassName}>Buy</CardTitle>
          <Paragraph type="secondary" className="m-0 text-center">
            Pay in fiat by using your credit or debit card — perfect for speed
            and ease!
          </Paragraph>

          <Flex vertical gap={tokenRequirementsGap} className="mt-auto">
            <TokenRequirements
              fiatAmount={fiatAmount ?? 0}
              isLoading={isRequirementsLoading}
              hasError={hasNativeTokenError}
              fundType="onRamp"
            />
          </Flex>
        </Flex>

        <Flex vertical>
          {isFiatAmountTooLow ? (
            <Alert
              message={`The minimum value of crypto to buy with your credit card is $${THRESHOLD_AMOUNT}.`}
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
                (showThresholdValidation && !hasAmountsToDeposit) ||
                isLoading ||
                hasNativeTokenError
              }
            >
              Buy Crypto with USD
            </Button>
          )}
        </Flex>
      </Flex>
    </OnRampMethodCardStyled>
  );
};
