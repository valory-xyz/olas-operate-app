import { CopyOutlined } from '@ant-design/icons';
import { Flex, message, Tooltip, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';

import { CustomAlert } from '@/components/Alert';
import { CardFlex } from '@/components/styled/CardFlex';
import { CardSection } from '@/components/styled/CardSection';
import { AGENT_CONFIG } from '@/config/agents';
import { CHAIN_CONFIG } from '@/config/chains';
import { NA } from '@/constants/symbols';
import { MIN_ETH_BALANCE_THRESHOLDS } from '@/constants/thresholds';
import { EvmChainId, EvmChainName } from '@/enums/Chain';
import { SetupScreen } from '@/enums/SetupScreen';
import { useMasterBalances } from '@/hooks/useBalanceContext';
import { useServices } from '@/hooks/useServices';
import { useSetup } from '@/hooks/useSetup';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { copyToClipboard } from '@/utils/copyToClipboard';
import { delayInSeconds } from '@/utils/delay';

import { SetupCreateHeader } from './SetupCreateHeader';

const { Text, Title, Paragraph } = Typography;

const AccountCreationCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 24px;
  margin-bottom: 24px;
  padding: 16px;
  background-image: url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' rx='12' ry='12' stroke='%23A3AEBB' stroke-width='2' stroke-dasharray='6' stroke-dashoffset='15' stroke-linecap='square'/%3e%3c/svg%3e");
  border-radius: 12px;
`;

const ICON_STYLE = { color: '#606F85' };

const statusMessage = (isFunded?: boolean) => {
  if (isFunded) {
    return 'Funds have been received!';
  } else {
    return 'Waiting for transaction';
  }
};

type SetupEoaFundingWaitingProps = { chainName: string };
const SetupEoaFundingWaiting = ({ chainName }: SetupEoaFundingWaitingProps) => {
  const { masterEoa } = useMasterWalletContext();
  const masterEoaAddress = masterEoa?.address;

  return (
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
      <AccountCreationCard>
        <Flex justify="space-between">
          <Text className="text-sm" type="secondary">
            Account creation address
          </Text>
          <Flex gap={10} align="center">
            <Tooltip title="Copy to clipboard">
              <CopyOutlined
                style={ICON_STYLE}
                onClick={() =>
                  masterEoaAddress &&
                  copyToClipboard(masterEoaAddress).then(() =>
                    message.success('Address copied!'),
                  )
                }
              />
            </Tooltip>
          </Flex>
        </Flex>

        <span className="can-select-text break-word">
          {`${masterEoaAddress || NA}`}
        </span>
        {/* <CustomAlert
          type="info"
          showIcon
          message={
            'After this point, do not send more funds to this address. Once your account is created, you will be given a new address - send further funds there.'
          }
        /> */}
      </AccountCreationCard>
    </>
  );
};

type SetupEoaFundingProps = {
  isFunded: boolean;
  minRequiredBalance: number;
  currency: string;
  chainName: string;
};
export const SetupEoaFundingForChain = ({
  isFunded,
  minRequiredBalance,
  currency,
  chainName,
}: SetupEoaFundingProps) => {
  return (
    <CardFlex>
      <SetupCreateHeader />
      <Title level={3}>
        {`Deposit ${minRequiredBalance} ${currency} on ${chainName}`}
      </Title>
      <Paragraph style={{ marginBottom: 0 }}>
        The app needs these funds to create your account on-chain.
      </Paragraph>

      <CardSection padding="12px 24px" bordertop="true" className="mt-12">
        <Text className={isFunded ? '' : 'loading-ellipses'}>
          Status: {statusMessage(isFunded)}
        </Text>
      </CardSection>
      {!isFunded && <SetupEoaFundingWaiting chainName={chainName} />}
    </CardFlex>
  );
};

/**
 * EOA funding setup screen
 */
export const SetupEoaFunding = () => {
  const { goto } = useSetup();
  const { selectedAgentType, selectedAgentConfig } = useServices();
  const { masterEoa } = useMasterWalletContext();
  const { masterWalletBalances } = useMasterBalances();
  const masterEoaAddress = masterEoa?.address;

  const [currentChain, setCurrentChain] = useState<EvmChainId>(
    selectedAgentConfig.evmHomeChainId,
  );

  const agentSafeFundingRequirements =
    AGENT_CONFIG[selectedAgentType]?.agentSafeFundingRequirements;
  const currentFundingRequirements =
    agentSafeFundingRequirements?.[currentChain];

  const eoaBalance = masterWalletBalances?.find(
    (balance) =>
      balance.walletAddress === masterEoaAddress &&
      balance.evmChainId === currentChain,
  );

  const isFunded =
    eoaBalance?.evmChainId === currentChain &&
    eoaBalance.balance >= MIN_ETH_BALANCE_THRESHOLDS[currentChain].safeCreation;

  const handleFunded = useCallback(async () => {
    message.success(`${EvmChainName[currentChain]} funds have been received!`);

    await delayInSeconds(1);

    const chains = Object.keys(agentSafeFundingRequirements);
    const indexOfCurrentChain = chains.indexOf(currentChain.toString());
    const nextChainExists = chains.length > indexOfCurrentChain + 1;

    // goto next chain
    if (nextChainExists) {
      setCurrentChain(chains[indexOfCurrentChain + 1] as unknown as EvmChainId);
      return;
    }

    goto(SetupScreen.SetupCreateSafe);
  }, [agentSafeFundingRequirements, currentChain, goto]);

  useEffect(() => {
    if (!currentFundingRequirements) return;
    if (!masterEoaAddress) return;
    if (!isFunded) return;

    handleFunded();
  }, [currentFundingRequirements, handleFunded, isFunded, masterEoaAddress]);

  if (!currentFundingRequirements) return null;

  return (
    <SetupEoaFundingForChain
      isFunded={isFunded}
      minRequiredBalance={currentFundingRequirements}
      currency={CHAIN_CONFIG[currentChain].nativeToken.symbol}
      chainName={CHAIN_CONFIG[currentChain].name}
    />
  );
};
