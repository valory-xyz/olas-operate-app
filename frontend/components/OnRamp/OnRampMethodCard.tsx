import { Button, Typography } from 'antd';
import { useMemo } from 'react';
import styled from 'styled-components';

import { COLOR, SETUP_SCREEN } from '@/constants';
import {
  useSetup,
  useTotalFiatFromNativeToken,
  useTotalNativeTokenRequired,
} from '@/hooks';

import { TokenRequirements } from '../SetupPage/FundYourAgent/components/TokensRequirements';
import { Alert, CardFlex, CardTitle } from '../ui';
import { useOnRampNetworkConfig } from './hooks/useOnRampNetworkConfig';

const OnRampMethodCardCard = styled(CardFlex)`
  width: 370px;
  border-color: ${COLOR.WHITE};

  .ant-card-body {
    height: 100%;
  }
`;

const MIN_ONRAMP_AMOUNT = 5;

const { Paragraph } = Typography;

export const OnRampMethodCard = () => {
  const { goto } = useSetup();
  const { networkId } = useOnRampNetworkConfig();

  const {
    isLoading: isNativeTokenLoading,
    hasError: hasNativeTokenError,
    totalNativeToken,
  } = useTotalNativeTokenRequired(networkId, 'onboarding');
  const { isLoading: isFiatLoading, data: fiatAmount } =
    useTotalFiatFromNativeToken(
      hasNativeTokenError ? undefined : totalNativeToken,
    );
  const isLoading = isNativeTokenLoading || isFiatLoading;

  const isFiatAmountTooLow = useMemo(() => {
    if (isLoading) return false;
    if (isNativeTokenLoading) return false;
    if (totalNativeToken === 0) return true;
    if (fiatAmount && fiatAmount < MIN_ONRAMP_AMOUNT) return true;
    return false;
  }, [fiatAmount, isLoading, isNativeTokenLoading, totalNativeToken]);

  return (
    <OnRampMethodCardCard>
      <div className="fund-method-card-body">
        <CardTitle>Buy</CardTitle>
        <Paragraph type="secondary" style={{ minHeight: '4.5rem' }}>
          Pay in fiat by using your credit or debit card — perfect for speed and
          ease!
        </Paragraph>
        <TokenRequirements
          fiatAmount={fiatAmount ?? 0}
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
