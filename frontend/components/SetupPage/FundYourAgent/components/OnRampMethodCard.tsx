import { Button, Typography } from 'antd';
import { useEffect, useMemo } from 'react';
import styled from 'styled-components';

import { COLOR, ON_RAMP_CHAIN_MAP, SETUP_SCREEN } from '@/constants';
import {
  useOnRampContext,
  useServices,
  useSetup,
  useTotalFiatFromNativeToken,
  useTotalNativeTokenRequired,
} from '@/hooks';
import {
  asEvmChainDetails,
  asMiddlewareChain,
} from '@/utils/middlewareHelpers';

import { Alert, CardFlex, CardTitle } from '../../../ui';
import { TokenRequirements } from './TokensRequirements';

const OnRampMethodCardCard = styled(CardFlex)`
  width: 370px;
  border-color: ${COLOR.WHITE};

  .ant-card-body {
    height: 100%;
  }
`;

const MIN_ONRAMP_AMOUNT = 5;

const { Paragraph } = Typography;

/**
 * Hook to set the network config required for Onramping in case of "onboarding"
 */
const useOnRampNetworkConfig = () => {
  const { selectedAgentConfig } = useServices();
  const { updateNetworkConfig } = useOnRampContext();

  const { selectedChainId, networkId, networkName, cryptoCurrencyCode } =
    useMemo(() => {
      const selectedChainId = selectedAgentConfig.evmHomeChainId;
      const fromChainName = asMiddlewareChain(selectedChainId);
      const networkId = ON_RAMP_CHAIN_MAP[fromChainName];
      const chainDetails = asEvmChainDetails(
        asMiddlewareChain(networkId.chain),
      );
      return {
        selectedChainId,
        networkId,
        networkName: chainDetails.name,
        cryptoCurrencyCode: chainDetails.symbol,
      };
    }, [selectedAgentConfig]);

  useEffect(() => {
    updateNetworkConfig({
      networkId: networkId.chain,
      networkName,
      cryptoCurrencyCode,
      selectedChainId,
    });
  }, [
    updateNetworkConfig,
    networkId,
    networkName,
    cryptoCurrencyCode,
    selectedChainId,
  ]);

  return { selectedChainId, networkId, networkName, cryptoCurrencyCode };
};

export const OnRampMethodCard = () => {
  const { goto } = useSetup();
  const { selectedChainId, networkId } = useOnRampNetworkConfig();

  const {
    isLoading: isNativeTokenLoading,
    hasError: hasNativeTokenError,
    totalNativeToken,
  } = useTotalNativeTokenRequired(networkId.chain, 'onboarding');
  const { isLoading: isFiatLoading, data: totalFiatDetails } =
    useTotalFiatFromNativeToken({
      nativeTokenAmount: hasNativeTokenError ? undefined : totalNativeToken,
      selectedChainId,
    });
  const isLoading = isNativeTokenLoading || isFiatLoading;

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
    <OnRampMethodCardCard>
      <div className="fund-method-card-body">
        <CardTitle>Buy</CardTitle>
        <Paragraph type="secondary" style={{ minHeight: '4.5rem' }}>
          Pay in fiat by using your credit or debit card — perfect for speed and
          ease!
        </Paragraph>
        <TokenRequirements
          fiatAmount={totalFiatDetails?.fiatAmount ?? 0}
          isLoading={isLoading}
          hasError={hasNativeTokenError}
          fundType="onRamp"
        />
      </div>
      {isFiatAmountTooLow ? (
        <Alert
          message={`The minimum value of crypto to buy with your credit card is $${MIN_ONRAMP_AMOUNT}.`}
          type="info"
          showIcon
          className="text-sm"
        />
      ) : (
        <Button
          type="primary"
          size="large"
          onClick={() => goto(SETUP_SCREEN.SetupOnRamp)}
          disabled={isLoading || hasNativeTokenError}
        >
          Buy Crypto with USD
        </Button>
      )}
    </OnRampMethodCardCard>
  );
};
