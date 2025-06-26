import { CopyOutlined } from '@ant-design/icons';
import {
  Button,
  Divider,
  Flex,
  message,
  Segmented,
  Tooltip,
  Typography,
} from 'antd';
import { kebabCase } from 'lodash';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';

import { CustomAlert } from '@/components/Alert';
import { SendFundAction } from '@/components/Bridge/types';
import { CardFlex } from '@/components/styled/CardFlex';
import { CardSection } from '@/components/styled/CardSection';
import { CHAIN_CONFIG } from '@/config/chains';
import { COLOR } from '@/constants/colors';
import { NA } from '@/constants/symbols';
import { EvmChainId } from '@/enums/Chain';
import { SetupScreen } from '@/enums/SetupScreen';
import { useMasterBalances } from '@/hooks/useBalanceContext';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useServices } from '@/hooks/useServices';
import { useSetup } from '@/hooks/useSetup';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { copyToClipboard } from '@/utils/copyToClipboard';
import { delayInSeconds } from '@/utils/delay';

import { SetupCreateHeader } from '../SetupCreateHeader';
import { useBeforeBridgeFunds } from './useBeforeBridgeFunds';

const { Text, Title, Paragraph } = Typography;

const Card = styled.div`
  display: flex;
  flex-direction: column;
  padding: 16px;
  border-radius: 12px;
`;

const AccountCreationCard = styled(Card)`
  gap: 8px;
  background-image: url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' rx='12' ry='12' stroke='%23A3AEBB' stroke-width='2' stroke-dasharray='6' stroke-dashoffset='15' stroke-linecap='square'/%3e%3c/svg%3e");
`;

const WaitingForTransactionCard = styled(Card)`
  align-items: flex-start;
  gap: 8px;
  border: 1px solid ${COLOR.BORDER_GRAY};
`;

const Line = styled(Divider)`
  width: auto;
  min-width: auto;
  flex-grow: 1;
  margin: 0;
`;

const ICON_STYLE = { color: COLOR.TEXT_LIGHT };

const statusMessage = (isFunded?: boolean) =>
  isFunded ? 'Funds have been received!' : 'Waiting for transaction';

const AccountCreationAddress = () => {
  const { masterEoa } = useMasterWalletContext();
  const address = masterEoa?.address;

  const handleCopyAddress = useCallback(() => {
    if (address) {
      copyToClipboard(address).then(() => message.success('Address copied!'));
    }
  }, [address]);

  return (
    <AccountCreationCard className="mt-16">
      <Flex justify="space-between">
        <Text className="text-sm" type="secondary">
          Account creation address
        </Text>
        <Flex gap={10} align="center">
          <Tooltip title="Copy to clipboard" placement="left">
            <CopyOutlined style={ICON_STYLE} onClick={handleCopyAddress} />
          </Tooltip>
        </Flex>
      </Flex>

      <span className="can-select-text break-word">{`${address || NA}`}</span>
    </AccountCreationCard>
  );
};

type SetupEoaFundingWaitingProps = { chainName: string };

/**
 * @deprecated View is deprecated, use SetupEoaFundingWaitingV2Props instead
 */
const SetupEoaFundingWaiting = ({ chainName }: SetupEoaFundingWaitingProps) => (
  <>
    <CardSection>
      <CustomAlert
        fullWidth
        type="warning"
        showIcon
        message={
          <Flex vertical gap={5}>
            <Text strong>Only send funds on {chainName}!</Text>
            <Text>You will lose any assets you send on other chains.</Text>
          </Flex>
        }
      />
    </CardSection>
    <AccountCreationAddress />
  </>
);

type SetupEoaFundingProps = {
  isFunded: boolean;
  minRequiredBalance: number;
  currency: string;
  chainName: string;
};

/**
 * @deprecated View is deprecated, use SetupEoaFundingForChainV2 instead
 */
const SetupEoaFundingForChain = ({
  isFunded,
  minRequiredBalance,
  currency,
  chainName,
}: SetupEoaFundingProps) => {
  return (
    <CardFlex noBorder>
      <SetupCreateHeader prev={SetupScreen.AgentSelection} />
      <Title level={3}>
        {`Deposit ${minRequiredBalance} ${currency} on ${chainName}`}
      </Title>
      <Paragraph style={{ marginBottom: 0 }}>
        The app needs these funds to create your account on-chain.
      </Paragraph>

      <CardSection $padding="12px 24px" $borderTop className="mt-12">
        <Text className={isFunded ? '' : 'loading-ellipses'}>
          Status: {statusMessage(isFunded)}
        </Text>
      </CardSection>
      {!isFunded && <SetupEoaFundingWaiting chainName={chainName} />}
    </CardFlex>
  );
};

type SetupEoaFundingPropsV2 = {
  isFunded: boolean;
  minRequiredBalance: number;
  currency: string;
  chainName: string;
};

const SetupEoaFundingForChainV2 = ({
  isFunded,
  minRequiredBalance,
  currency,
  chainName,
}: SetupEoaFundingPropsV2) => (
  <>
    <Paragraph style={{ marginBottom: 12 }}>
      Send funds on {chainName} to create your account. Additional funds for
      staking and operating your agent will be requested separately.
    </Paragraph>

    <CardSection>
      <CustomAlert
        fullWidth
        type="warning"
        showIcon
        message={
          <Flex vertical gap={5}>
            <Text strong>Only send funds on {chainName} chain!</Text>
            <Text>You will lose any assets you send on other chains.</Text>
          </Flex>
        }
      />
    </CardSection>
    <WaitingForTransactionCard className="mt-16">
      <Flex gap={8} align="center">
        <Image
          src={`/chains/${kebabCase(chainName)}-chain.png`}
          width={20}
          height={20}
          alt="chain logo"
        />
        <Text>{chainName}</Text>
      </Flex>
      <Flex justify="space-between" align="center" gap={16} className="w-full">
        <Text strong>
          {minRequiredBalance} {currency}
        </Text>
        <Line />
        <Text
          style={{ display: 'block', width: 172 }}
          type="secondary"
          className={isFunded ? '' : 'loading-ellipses'}
        >
          {statusMessage(isFunded)}
        </Text>
      </Flex>
    </WaitingForTransactionCard>
    <AccountCreationAddress />
  </>
);

/**
 * EOA funding setup screen
 */
export const SetupEoaFunding = () => {
  const isBridgeOnboardingEnabled = useFeatureFlag('bridge-onboarding');
  const { goto } = useSetup();
  const { selectedAgentConfig } = useServices();
  const { masterEoa } = useMasterWalletContext();
  const { masterWalletBalances } = useMasterBalances();
  const updateBeforeBridgingFunds = useBeforeBridgeFunds();

  const [currentChain, setCurrentChain] = useState<EvmChainId>(
    selectedAgentConfig.evmHomeChainId,
  );
  const [fundType, setFundType] = useState<SendFundAction>('transfer');

  const masterEoaAddress = masterEoa?.address;
  const currentFundingRequirements = CHAIN_CONFIG[currentChain];

  const eoaBalance = masterWalletBalances?.find(
    (balance) =>
      balance.walletAddress === masterEoaAddress &&
      balance.evmChainId === currentChain,
  );

  const isFunded =
    eoaBalance?.evmChainId === currentChain &&
    eoaBalance.balance >= CHAIN_CONFIG[currentChain].safeCreationThreshold;

  // once funded, go to next chain or create safe
  const handleFunded = useCallback(async () => {
    message.success(
      `${currentFundingRequirements.name} funds have been received!`,
    );

    await delayInSeconds(1);

    const chains = selectedAgentConfig.requiresAgentSafesOn;
    const indexOfCurrentChain = chains.indexOf(currentChain);
    const nextChainExists = chains.length > indexOfCurrentChain + 1;

    // goto next chain
    if (nextChainExists) {
      setCurrentChain(chains[indexOfCurrentChain + 1]);
      return;
    }

    goto(SetupScreen.SetupCreateSafe);
  }, [
    currentChain,
    goto,
    currentFundingRequirements.name,
    selectedAgentConfig.requiresAgentSafesOn,
  ]);

  useEffect(() => {
    if (!currentFundingRequirements) return;
    if (!masterEoaAddress) return;
    if (!isFunded) return;

    handleFunded();
  }, [currentFundingRequirements, handleFunded, isFunded, masterEoaAddress]);

  const handleBridgeFunds = useCallback(async () => {
    try {
      await updateBeforeBridgingFunds();
      goto(SetupScreen.SetupBridgeOnboardingScreen);
    } catch (error) {
      message.error('Failed to prepare for bridging funds. Please try again.');
      console.error('Error updating before bridging funds:', error);
    }
  }, [goto, updateBeforeBridgingFunds]);

  if (!currentFundingRequirements) return null;

  if (!isBridgeOnboardingEnabled) {
    return (
      <SetupEoaFundingForChain
        isFunded={isFunded}
        minRequiredBalance={currentFundingRequirements.safeCreationThreshold}
        currency={currentFundingRequirements.nativeToken.symbol}
        chainName={currentFundingRequirements.name}
      />
    );
  }

  return (
    <CardFlex $noBorder>
      <SetupCreateHeader prev={SetupScreen.AgentSelection} />
      <Title level={3} className="mb-8">
        Fund your agent
      </Title>
      <Text type="secondary">Choose how.</Text>
      <CardSection
        $padding="20px 24px"
        $borderTop
        $borderBottom
        className="mt-12 mb-12"
      >
        <Segmented<SendFundAction>
          options={[
            {
              label: `Send on ${currentFundingRequirements.name}`,
              value: 'transfer',
            },
            { label: 'Bridge from Ethereum', value: 'bridge' },
          ]}
          onChange={setFundType}
          value={fundType}
          block
          className="w-full"
        />
      </CardSection>

      {fundType === 'transfer' ? (
        <SetupEoaFundingForChainV2
          isFunded={isFunded}
          minRequiredBalance={currentFundingRequirements.safeCreationThreshold}
          currency={currentFundingRequirements.nativeToken.symbol}
          chainName={currentFundingRequirements.name}
        />
      ) : (
        <CardSection $padding="0px 24px" vertical gap={16}>
          <Text className="text-base">
            Bridge from Ethereum directly to your agent. No further funds will
            be needed after bridging.
          </Text>
          <Button onClick={handleBridgeFunds} block type="primary" size="large">
            Bridge funds
          </Button>
        </CardSection>
      )}
    </CardFlex>
  );
};
