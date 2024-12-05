import { CopyOutlined } from '@ant-design/icons';
import { Flex, message, Tooltip, Typography } from 'antd';
import { ethers } from 'ethers';
import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';

import { CustomAlert } from '@/components/Alert';
import { CardFlex } from '@/components/styled/CardFlex';
import { CardSection } from '@/components/styled/CardSection';
import { CHAIN_CONFIG, ChainConfig } from '@/config/chains';
import { PROVIDERS } from '@/constants/providers';
import { NA } from '@/constants/symbols';
import { MIN_ETH_BALANCE_THRESHOLDS } from '@/constants/thresholds';
import { AgentType } from '@/enums/Agent';
import { EvmChainId } from '@/enums/Chain';
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

type SetupEoaFundingWaitingProps = { chainName: string; currency: string };
const SetupEoaFundingWaiting = ({
  chainName,
  currency,
}: SetupEoaFundingWaitingProps) => {
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
          {`${currency}: ${masterEoaAddress || NA}`}
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
      {!isFunded && (
        <SetupEoaFundingWaiting chainName={chainName} currency={currency} />
      )}
    </CardFlex>
  );
};

type EoaFundingMapParams = {
  provider: ethers.providers.JsonRpcProvider;
  chainConfig: ChainConfig;
  requiredEth: number;
};

// TODO: chain independent
// use SERVICE_TEMPLATES[].configurations instead?
const EOA_FUNDING_MAP: Record<
  AgentType,
  Partial<Record<EvmChainId, EoaFundingMapParams>>
> = {
  [AgentType.PredictTrader]: {
    [EvmChainId.Gnosis]: {
      provider: PROVIDERS[EvmChainId.Gnosis].provider,
      chainConfig: CHAIN_CONFIG[EvmChainId.Gnosis],
      requiredEth: MIN_ETH_BALANCE_THRESHOLDS[EvmChainId.Gnosis].safeCreation,
    },
  },
  [AgentType.Memeooorr]: {
    [EvmChainId.Base]: {
      provider: PROVIDERS[EvmChainId.Base].provider,
      chainConfig: CHAIN_CONFIG[EvmChainId.Base],
      requiredEth: MIN_ETH_BALANCE_THRESHOLDS[EvmChainId.Base].safeCreation,
    },
  },
  // [AgentType.Optimus]: {
  //   [EvmChainId.Optimism]: {
  //     provider: PROVIDERS[EvmChainId.Optimism].provider,
  //     chainConfig: CHAIN_CONFIG[EvmChainId.Optimism],
  //     requiredEth: MIN_ETH_BALANCE_THRESHOLDS[EvmChainId.Optimism].safeCreation,
  //   },
  //   [EvmChainId.Ethereum]: {
  //     provider: PROVIDERS[EvmChainId.Ethereum].provider,
  //     chainConfig: CHAIN_CONFIG[EvmChainId.Ethereum],
  //     requiredEth: MIN_ETH_BALANCE_THRESHOLDS[EvmChainId.Ethereum].safeCreation,
  //   },
  //   [EvmChainId.Base]: {
  //     provider: PROVIDERS[EvmChainId.Base].provider,
  //     chainConfig: CHAIN_CONFIG[EvmChainId.Base],
  //     requiredEth: MIN_ETH_BALANCE_THRESHOLDS[EvmChainId.Base].safeCreation,
  //   },
  // }
};

export const SetupEoaFunding = () => {
  const { goto } = useSetup();
  const { selectedAgentType, selectedAgentConfig } = useServices();
  const { masterEoa } = useMasterWalletContext();
  const { masterWalletBalances } = useMasterBalances();
  const masterEoaAddress = masterEoa?.address;

  const [currentChain, setCurrentChain] = useState<EvmChainId>(
    selectedAgentConfig.evmHomeChainId,
  );

  const currentFundingMapObject =
    EOA_FUNDING_MAP[selectedAgentType][currentChain];

  const eoaBalance = masterWalletBalances?.find(
    (balance) =>
      balance.walletAddress === masterEoaAddress &&
      balance.evmChainId === currentChain,
  );

  const isFunded =
    eoaBalance?.evmChainId === currentChain &&
    eoaBalance.balance >= MIN_ETH_BALANCE_THRESHOLDS[currentChain].safeCreation;

  const handleFunded = useCallback(async () => {
    message.success(
      `${currentFundingMapObject?.chainConfig.name} funds have been received!`,
    );

    await delayInSeconds(1);

    const chains = Object.keys(EOA_FUNDING_MAP[selectedAgentType]);
    const indexOfCurrentChain = chains.indexOf(currentChain.toString());
    const nextChainExists = chains.length > indexOfCurrentChain + 1;

    if (nextChainExists) {
      // goto next chain
      setCurrentChain(chains[indexOfCurrentChain + 1] as unknown as EvmChainId);
      return;
    }

    goto(SetupScreen.SetupCreateSafe);
  }, [
    currentChain,
    currentFundingMapObject?.chainConfig.name,
    goto,
    selectedAgentType,
  ]);

  useEffect(() => {
    if (!currentFundingMapObject) return;
    if (!masterEoaAddress) return;
    if (!isFunded) return;

    handleFunded();
  }, [currentFundingMapObject, handleFunded, isFunded, masterEoaAddress]);

  if (!currentFundingMapObject) return null;

  return (
    <SetupEoaFundingForChain
      isFunded={isFunded}
      minRequiredBalance={currentFundingMapObject.requiredEth}
      currency={currentFundingMapObject.chainConfig.nativeToken.symbol}
      chainName={currentFundingMapObject.chainConfig.name}
    />
  );
};
