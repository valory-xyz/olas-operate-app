import { CopyOutlined } from '@ant-design/icons';
import { Flex, message, Tooltip, Typography } from 'antd';
import { BigNumber, ethers } from 'ethers';
import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { useInterval } from 'usehooks-ts';

import { MiddlewareChain } from '@/client';
import { CustomAlert } from '@/components/Alert';
import { CardFlex } from '@/components/styled/CardFlex';
import { CardSection } from '@/components/styled/CardSection';
import { CHAIN_CONFIG } from '@/config/chains';
import { PROVIDERS } from '@/constants/providers';
import { NA } from '@/constants/symbols';
import { MIN_ETH_BALANCE_THRESHOLDS } from '@/constants/thresholds';
import { ChainId } from '@/enums/Chain';
import { SetupScreen } from '@/enums/SetupScreen';
import { useMasterBalances } from '@/hooks/useBalanceContext';
import { useSetup } from '@/hooks/useSetup';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { Address } from '@/types/Address';
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
          {`XDAI: ${masterEoaAddress || NA}`}
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
  onFunded: () => void;
};
export const SetupEoaFundingForChain = ({
  isFunded,
  minRequiredBalance,
  currency,
  chainName,
  onFunded,
}: SetupEoaFundingProps) => {
  const { goto } = useSetup();

  useEffect(() => {
    message.success(`${chainName} funds have been received!`);

    // Wait for a second before moving to the next step
    delayInSeconds(1).then(onFunded);
  }, [chainName, goto, isFunded, onFunded]);

  return (
    <CardFlex>
      <SetupCreateHeader prev={SetupScreen.SetupBackupSigner} disabled />
      <Title level={3}>
        {`Deposit ${minRequiredBalance} ${currency} on ${chainName}`}
      </Title>
      <Paragraph style={{ marginBottom: 0 }}>
        The app needs these funds to create your account on-chain.
      </Paragraph>

      <CardSection
        padding="12px 24px"
        bordertop="true"
        borderbottom={isFunded ? 'true' : 'false'}
      >
        <Text className={isFunded ? '' : 'loading-ellipses'}>
          Status: {statusMessage(isFunded)}
        </Text>
      </CardSection>
      {!isFunded && <SetupEoaFundingWaiting chainName={chainName} />}
    </CardFlex>
  );
};

// TODO: chain independent
const eoaFundingMap = {
  //   [MiddlewareChain.OPTIMISM]: {
  //     provider: OPTIMISM_PROVIDER,
  //     chainConfig: CHAIN_CONFIG.OPTIMISM,
  //     requiredEth:
  //       MIN_ETH_BALANCE_THRESHOLDS[MiddlewareChain.OPTIMISM].safeCreation,
  //   },
  //   [MiddlewareChain.ETHEREUM]: {
  //     provider: ETHEREUM_PROVIDER,
  //     chainConfig: CHAIN_CONFIG.ETHEREUM,
  //     requiredEth:
  //       MIN_ETH_BALANCE_THRESHOLDS[MiddlewareChain.ETHEREUM].safeCreation,
  //   },
  //   [MiddlewareChain.BASE]: {
  //     provider: BASE_PROVIDER,
  //     chainConfig: CHAIN_CONFIG.BASE,
  //     requiredEth: MIN_ETH_BALANCE_THRESHOLDS[MiddlewareChain.BASE].safeCreation,
  //   },
  [MiddlewareChain.GNOSIS]: {
    provider: PROVIDERS[ChainId.Gnosis].provider,
    chainConfig: CHAIN_CONFIG[ChainId.Gnosis],
    requiredEth: MIN_ETH_BALANCE_THRESHOLDS[ChainId.Gnosis].safeCreation,
  },
};

export const SetupEoaFunding = () => {
  const { goto } = useSetup();
  const { masterEoa } = useMasterWalletContext();
  const { masterWalletBalances } = useMasterBalances();
  const masterEoaAddress = masterEoa?.address;

  const [currentChain, setCurrentChain] = useState<MiddlewareChain>(
    +Object.keys(eoaFundingMap)[0] as MiddlewareChain,
  );

  const currentFundingMapObject =
    eoaFundingMap[+currentChain as keyof typeof eoaFundingMap];

  const getIsCurrentChainFunded = useCallback(
    async (
      currentFundingMapObject: (typeof eoaFundingMap)[keyof typeof eoaFundingMap],
      masterEoaAddress: Address,
    ) => {
      const { provider, requiredEth } = currentFundingMapObject;

      return provider
        .getBalance(masterEoaAddress)
        .then(
          (balance: BigNumber) =>
            parseFloat(ethers.utils.formatEther(balance)) >= requiredEth,
        );
    },
    [],
  );

  useInterval(async () => {
    if (!masterEoaAddress) return;

    const currentChainIsFunded = await getIsCurrentChainFunded(
      currentFundingMapObject,
      masterEoaAddress,
    );

    if (!currentChainIsFunded) return;

    message.success(
      `${currentFundingMapObject.chainConfig.name} funds have been received!`,
    );

    const indexOfCurrentChain = Object.keys(eoaFundingMap).indexOf(
      currentChain.toString(),
    );
    const nextChainExists =
      Object.keys(eoaFundingMap).length > indexOfCurrentChain + 1;
    if (nextChainExists) {
      // goto next chain
      setCurrentChain(
        +Object.keys(eoaFundingMap)[indexOfCurrentChain + 1] as MiddlewareChain,
      );
      return;
    }
    goto(SetupScreen.SetupCreateSafe);
  }, 5000);

  const eoaBalance = masterWalletBalances?.find(
    (balance) => balance.walletAddress === masterEoaAddress,
  );
  const isFunded =
    eoaBalance?.chainId === ChainId.Gnosis &&
    eoaBalance.balance >=
      MIN_ETH_BALANCE_THRESHOLDS[ChainId.Gnosis].safeCreation;

  return (
    <CardFlex>
      <SetupCreateHeader prev={SetupScreen.SetupBackupSigner} disabled />
      <Title level={3}>
        {`Deposit ${currentFundingMapObject.requiredEth} ${currentFundingMapObject.chainConfig.currency} on ${currentFundingMapObject.chainConfig.name}`}
      </Title>
      <Paragraph style={{ marginBottom: 0 }}>
        The app needs these funds to create your account on-chain.
      </Paragraph>

      <CardSection
        padding="12px 24px"
        bordertop="true"
        borderbottom={isFunded ? 'true' : 'false'}
      >
        <Text className={isFunded ? '' : 'loading-ellipses'}>
          Status: {statusMessage(isFunded)}
        </Text>
      </CardSection>

      <SetupEoaFundingWaiting
        chainName={currentFundingMapObject.chainConfig.name}
      />
    </CardFlex>
  );
};
